from calendar import monthrange
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import Budget, Category, Transaction, User
from app.schemas import (
    BudgetCreate,
    BudgetStatusResponse,
    CategoryAtRisk,
    ForecastResponse,
)

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

    if existing:
        existing.monthly_limit = budget_in.monthly_limit
        if budget_in.essential_pct is not None:
            existing.essential_pct = budget_in.essential_pct
        if budget_in.discretionary_pct is not None:
            existing.discretionary_pct = budget_in.discretionary_pct
        if budget_in.ai_smart_adjust is not None:
            existing.ai_smart_adjust = budget_in.ai_smart_adjust
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_b = Budget(
            user_id=current_user.id,
            category_id=category_id,
            monthly_limit=budget_in.monthly_limit,
            essential_pct=budget_in.essential_pct if budget_in.essential_pct is not None else 50.0,
            discretionary_pct=budget_in.discretionary_pct if budget_in.discretionary_pct is not None else 30.0,
            ai_smart_adjust=budget_in.ai_smart_adjust if budget_in.ai_smart_adjust is not None else True,
        )
        db.add(new_b)
        db.commit()
        db.refresh(new_b)
        return new_b


@router.get("/status", response_model=list[BudgetStatusResponse])
def get_budget_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    # Compute spent so far this month for each category and overall
    cat_spent = {}
    total_spent = 0.0

    for tx in transactions:
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

        ess_val = round(b.monthly_limit * (b.essential_pct / 100.0), 2)
        disc_val = round(b.monthly_limit * (b.discretionary_pct / 100.0), 2)

        result.append(
            BudgetStatusResponse(
                category_id=b.category_id,
                category_name=cat_name,
                monthly_limit=b.monthly_limit,
                essential_pct=b.essential_pct,
                discretionary_pct=b.discretionary_pct,
                essential=ess_val,
                discretionary=disc_val,
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
    days_in_month = monthrange(now.year, now.month)[1]
    days_elapsed = max(1, now.day)

    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()

    current_month_expenses = []
    cat_spent = {}
    total_expense_so_far = 0.0

    for tx in transactions:
        if tx.amount < 0:
            amt = abs(tx.amount)
            total_expense_so_far += amt
            current_month_expenses.append(tx)
            c_id = tx.category_id or "unassigned"
            cat_spent[c_id] = cat_spent.get(c_id, 0.0) + amt

    total_monthly_budget = sum(b.monthly_limit for b in budgets)

    # Insufficient data check for early month
    is_insufficient = days_elapsed < 2 or (len(current_month_expenses) < 2 and total_expense_so_far == 0)

    daily_burn_rate = round(total_expense_so_far / days_elapsed, 2)
    projected_total = round(daily_burn_rate * days_in_month, 2) if not is_insufficient else None

    # Categories at risk
    categories_at_risk = []
    for b in budgets:
        if b.monthly_limit > 0:
            c_id = b.category_id or "unassigned"
            spent_so_far = cat_spent.get(c_id, 0.0)
            proj_cat_spend = round((spent_so_far / days_elapsed) * days_in_month, 2)
            if proj_cat_spend > b.monthly_limit:
                cat_name = b.category_rel.name if b.category_rel else "Overall"
                categories_at_risk.append(
                    CategoryAtRisk(
                        category_id=b.category_id,
                        category_name=cat_name,
                        projected_spend=proj_cat_spend,
                        monthly_limit=b.monthly_limit,
                    )
                )

    remaining_budget = max(0.0, total_monthly_budget - total_expense_so_far)

    # Over budget risk calculation
    over_budget_risk = False
    if projected_total is not None and total_monthly_budget > 0:
        over_budget_risk = projected_total > total_monthly_budget
    elif categories_at_risk:
        over_budget_risk = True

    # Days until exhaustion
    days_until_exhausted = None
    if daily_burn_rate > 0 and remaining_budget > 0:
        days_until_exhausted = int(remaining_budget // daily_burn_rate)
    elif remaining_budget == 0 and total_monthly_budget > 0:
        days_until_exhausted = 0

    # Overall Status Classification
    status = "UNDER_BUDGET"
    if over_budget_risk:
        status = "OVER_BUDGET"
    elif projected_total is not None and total_monthly_budget > 0 and projected_total >= (total_monthly_budget * 0.85):
        status = "NEAR_BUDGET"

    return ForecastResponse(
        daily_burn_rate=daily_burn_rate,
        projected_total=projected_total,
        over_budget_risk=over_budget_risk,
        days_until_budget_exhausted=days_until_exhausted,
        current_spend=round(total_expense_so_far, 2),
        monthly_budget=round(total_monthly_budget, 2),
        remaining_budget=round(remaining_budget, 2),
        insufficient_data=is_insufficient,
        status=status,
        categories_at_risk=categories_at_risk,
    )
