from calendar import monthrange
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import Budget, Category, Transaction, User
from app.schemas import (
    BudgetCreate,
    BudgetStatusResponse,
    CategoryAtRisk,
    ForecastResponse,
)
from app.services.alerts import check_budget_threshold

router = APIRouter(prefix="/budgets", tags=["budgets"])


def parse_tx_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    formats = ["%b %d, %Y", "%b %d %Y", "%Y-%m-%d", "%B %d, %Y", "%m/%d/%Y", "%d/%m/%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            pass
    return None


@router.post("", status_code=201)
def create_or_update_budget(
    budget_in: BudgetCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category_id = budget_in.category_id
    if not category_id and budget_in.category_name:
        cat = (
            db.query(Category)
            .filter(
                Category.user_id == current_user.id,
                Category.name.ilike(budget_in.category_name),
            )
            .first()
        )
        if cat:
            category_id = cat.id

    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == category_id,
        )
        .first()
    )

    result_budget = None
    if existing:
        if budget_in.monthly_limit is not None:
            existing.monthly_limit = budget_in.monthly_limit
        if budget_in.savings_goal is not None:
            existing.savings_goal = budget_in.savings_goal
        if budget_in.essential_pct is not None:
            existing.essential_pct = budget_in.essential_pct
        if budget_in.discretionary_pct is not None:
            existing.discretionary_pct = budget_in.discretionary_pct
        if budget_in.ai_smart_adjust is not None:
            existing.ai_smart_adjust = budget_in.ai_smart_adjust
        db.commit()
        db.refresh(existing)
        result_budget = existing
    else:
        new_b = Budget(
            user_id=current_user.id,
            category_id=category_id,
            monthly_limit=budget_in.monthly_limit if budget_in.monthly_limit is not None else 0.0,
            savings_goal=budget_in.savings_goal if budget_in.savings_goal is not None else 0.0,
            essential_pct=budget_in.essential_pct if budget_in.essential_pct is not None else 50.0,
            discretionary_pct=budget_in.discretionary_pct if budget_in.discretionary_pct is not None else 30.0,
            ai_smart_adjust=budget_in.ai_smart_adjust if budget_in.ai_smart_adjust is not None else True,
        )
        db.add(new_b)
        db.commit()
        db.refresh(new_b)
        result_budget = new_b

    # Check budget threshold in background
    check_budget_threshold(
        user_id=current_user.id,
        category_id=category_id,
        db=db,
        background_tasks=background_tasks,
    )

    return result_budget


@router.get("/status", response_model=list[BudgetStatusResponse])
def get_budget_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    # Compute spent so far this month for each category and overall with defensive sanity checks
    cat_spent = {}
    total_spent = 0.0

    for tx in transactions:
        if getattr(tx, "is_flagged", False) or abs(tx.amount) >= 1_000_000:
            import logging
            logging.getLogger(__name__).warning(
                "Defensive aggregation skipped outlier/flagged transaction ID=%s, merchant=%s, amount=%s",
                tx.id, tx.merchant, tx.amount
            )
            continue

        # Check that transaction is within current calendar month and year
        tx_dt = parse_tx_date(tx.date) if tx.date else None
        if tx_dt and (tx_dt.year != now.year or tx_dt.month != now.month):
            continue

        if tx.amount < 0:  # Expense
            spent_amt = abs(tx.amount)
            total_spent += spent_amt
            c_id = tx.category_id or "unassigned"
            cat_spent[c_id] = cat_spent.get(c_id, 0.0) + spent_amt

    if not budgets:
        return [
            BudgetStatusResponse(
                category_id=None,
                category_name="Overall",
                monthly_limit=0.0,
                savings_goal=0.0,
                essential_pct=50.0,
                discretionary_pct=30.0,
                essential=0.0,
                discretionary=0.0,
                ai_smart_adjust=True,
                spent=round(total_spent, 2),
                remaining=0.0,
            )
        ]

    result = []
    for b in budgets:
        cat_name = b.category_rel.name if b.category_rel else "Overall"
        c_id = b.category_id or "unassigned"
        spent = cat_spent.get(c_id, total_spent if b.category_id is None else 0.0)
        remaining = max(0.0, b.monthly_limit - spent)
        result.append(
            BudgetStatusResponse(
                category_id=b.category_id,
                category_name=cat_name,
                monthly_limit=b.monthly_limit,
                savings_goal=getattr(b, "savings_goal", 0.0) or 0.0,
                essential_pct=b.essential_pct,
                discretionary_pct=b.discretionary_pct,
                essential=round(b.monthly_limit * (b.essential_pct / 100.0), 2),
                discretionary=round(b.monthly_limit * (b.discretionary_pct / 100.0), 2),
                ai_smart_adjust=b.ai_smart_adjust,
                spent=round(spent, 2),
                remaining=round(remaining, 2),
            )
        )
    return result


@router.get("/forecast", response_model=ForecastResponse)
def get_budget_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Budget Forecasting Business Logic:
    1. Determine elapsed days in the current month vs total days in month.
    2. Aggregate user's current month expense transactions.
    3. Calculate daily burn rate = current_month_spend / days_elapsed.
    4. Project end-of-month total = daily_burn_rate * days_in_month.
    5. Evaluate `over_budget_risk` boolean = projected_total > total_monthly_budget.
    6. Compute days until budget exhaustion = floor(remaining_budget / daily_burn_rate).
    7. Identify categories exceeding their monthly allocation limit.
    """
    now = datetime.now(timezone.utc)
    upcoming_year = now.year + 1 if now.month == 12 else now.year
    upcoming_month = 1 if now.month == 12 else now.month + 1
    days_in_upcoming_month = monthrange(upcoming_year, upcoming_month)[1]

    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()

    current_month_expenses = []
    cat_spent = {}
    current_month_total_expense = 0.0
    monthly_expenses_current_year: dict[int, float] = {}

    for tx in transactions:
        if getattr(tx, "is_flagged", False) or abs(tx.amount) >= 1_000_000:
            import logging
            logging.getLogger(__name__).warning(
                "Forecast aggregation skipped outlier/flagged transaction ID=%s, merchant=%s, amount=%s",
                tx.id, tx.merchant, tx.amount
            )
            continue

        tx_dt = parse_tx_date(tx.date) if tx.date else None
        if not tx_dt:
            continue

        if tx.amount < 0:
            amt = abs(tx.amount)
            # Track current year monthly totals
            if tx_dt.year == now.year:
                monthly_expenses_current_year[tx_dt.month] = (
                    monthly_expenses_current_year.get(tx_dt.month, 0.0) + amt
                )

            # Track current month
            if tx_dt.year == now.year and tx_dt.month == now.month:
                current_month_total_expense += amt
                current_month_expenses.append(tx)
                c_id = tx.category_id or "unassigned"
                cat_spent[c_id] = cat_spent.get(c_id, 0.0) + amt

    total_monthly_budget = sum(b.monthly_limit for b in budgets)

    # 1. Projected Spend: Average of all monthly expenses for current year
    months_with_data = len(monthly_expenses_current_year)
    if months_with_data > 0:
        projected_spend = round(sum(monthly_expenses_current_year.values()) / months_with_data, 2)
    else:
        projected_spend = round(current_month_total_expense, 2)

    # 2. Expected Daily: Projected Spend / days in upcoming month
    expected_daily = round(projected_spend / days_in_upcoming_month, 2) if days_in_upcoming_month > 0 else 0.0

    is_insufficient = months_with_data == 0 and current_month_total_expense == 0.0

    # Categories at risk
    categories_at_risk = []
    for b in budgets:
        if b.monthly_limit > 0:
            c_id = b.category_id or "unassigned"
            spent_so_far = cat_spent.get(c_id, 0.0)
            if spent_so_far > b.monthly_limit:
                cat_name = b.category_rel.name if b.category_rel else "Overall"
                categories_at_risk.append(
                    CategoryAtRisk(
                        category_id=b.category_id,
                        category_name=cat_name,
                        projected_spend=round(spent_so_far, 2),
                        monthly_limit=b.monthly_limit,
                    )
                )

    remaining_budget = max(0.0, total_monthly_budget - current_month_total_expense)

    # Over budget risk calculation
    over_budget_risk = False
    if projected_spend > 0 and total_monthly_budget > 0:
        over_budget_risk = projected_spend > total_monthly_budget
    elif categories_at_risk:
        over_budget_risk = True

    # Days until exhaustion
    days_until_exhausted = None
    if expected_daily > 0 and remaining_budget > 0:
        days_until_exhausted = int(remaining_budget // expected_daily)
    elif remaining_budget == 0 and total_monthly_budget > 0:
        days_until_exhausted = 0

    # Overall Status Classification
    status = "UNDER_BUDGET"
    if over_budget_risk:
        status = "OVER_BUDGET"
    elif projected_spend > 0 and total_monthly_budget > 0 and projected_spend >= (total_monthly_budget * 0.85):
        status = "NEAR_BUDGET"

    return ForecastResponse(
        daily_burn_rate=expected_daily,
        projected_total=projected_spend,
        over_budget_risk=over_budget_risk,
        days_until_budget_exhausted=days_until_exhausted,
        current_spend=round(current_month_total_expense, 2),
        monthly_budget=round(total_monthly_budget, 2),
        remaining_budget=round(remaining_budget, 2),
        insufficient_data=is_insufficient,
        status=status,
        categories_at_risk=categories_at_risk,
    )
