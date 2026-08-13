from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import Category, RecurringItem, Transaction, User
from app.schemas import (
    RecurringCreate,
    RecurringDetectResponse,
    RecurringItemResponse,
    RecurringUpdate,
)

router = APIRouter(prefix="/recurring", tags=["recurring"])


def parse_date_safely(date_str: str) -> datetime | None:
    if not date_str:
        return None
    date_clean = date_str.strip()
    formats = [
        "%b %d, %Y",
        "%b %d %Y",
        "%Y-%m-%d",
        "%B %d, %Y",
        "%m/%d/%Y",
        "%d/%m/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_clean, fmt)
        except ValueError:
            pass
    return None


@router.get("", response_model=list[RecurringItemResponse])
def list_recurring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(RecurringItem)
        .filter(RecurringItem.user_id == current_user.id)
        .order_by(RecurringItem.created_at.desc())
        .all()
    )

    result = []
    for item in items:
        cat_name = item.category_rel.name if item.category_rel else (item.merchant or "Subscription")
        due = item.next_due_date or item.next_expected_date
        result.append(
            RecurringItemResponse(
                id=item.id,
                merchant=item.merchant,
                name=item.name or item.merchant,
                amount=item.amount,
                frequency=item.frequency,
                next_due_date=due,
                next_expected_date=due,
                dueDate=due,
                category=cat_name,
                icon=item.icon or "subscriptions",
                interval_days=item.interval_days or 30,
                detected_automatically=item.detected_automatically,
            )
        )
    return result


@router.post("", response_model=RecurringItemResponse, status_code=status.HTTP_201_CREATED)
def create_recurring(
    item_in: RecurringCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cat_id = None
    if item_in.category:
        cat = (
            db.query(Category)
            .filter(
                Category.user_id == current_user.id,
                Category.name.ilike(item_in.category),
            )
            .first()
        )
        if cat:
            cat_id = cat.id

    due = item_in.next_expected_date or item_in.dueDate or item_in.date

    item = RecurringItem(
        user_id=current_user.id,
        category_id=cat_id,
        merchant=item_in.merchant or item_in.name,
        name=item_in.name,
        amount=abs(item_in.amount),
        frequency=item_in.frequency,
        next_due_date=due,
        next_expected_date=due,
        icon=item_in.icon or "subscriptions",
        interval_days=item_in.interval_days or 30,
        detected_automatically=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return RecurringItemResponse(
        id=item.id,
        merchant=item.merchant,
        name=item.name,
        amount=item.amount,
        frequency=item.frequency,
        next_due_date=due,
        next_expected_date=due,
        dueDate=due,
        category=item_in.category or "Subscriptions",
        icon=item.icon,
        interval_days=item.interval_days,
        detected_automatically=False,
    )


@router.patch("/{recurring_id}", response_model=RecurringItemResponse)
def update_recurring(
    recurring_id: str,
    item_in: RecurringUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = (
        db.query(RecurringItem)
        .filter(
            RecurringItem.id == recurring_id,
            RecurringItem.user_id == current_user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found")

    if item_in.name is not None:
        item.name = item_in.name
    if item_in.merchant is not None:
        item.merchant = item_in.merchant
    if item_in.amount is not None:
        item.amount = abs(item_in.amount)
    if item_in.frequency is not None:
        item.frequency = item_in.frequency
    if item_in.next_due_date is not None:
        item.next_due_date = item_in.next_due_date
        item.next_expected_date = item_in.next_due_date
    if item_in.next_expected_date is not None:
        item.next_expected_date = item_in.next_expected_date
        item.next_due_date = item_in.next_expected_date
    if item_in.icon is not None:
        item.icon = item_in.icon
    if item_in.interval_days is not None:
        item.interval_days = item_in.interval_days
    if item_in.category is not None:
        cat = (
            db.query(Category)
            .filter(
                Category.user_id == current_user.id,
                Category.name.ilike(item_in.category),
            )
            .first()
        )
        if cat:
            item.category_id = cat.id

    db.commit()
    db.refresh(item)

    cat_name = item.category_rel.name if item.category_rel else (item.merchant or "Subscription")
    due = item.next_due_date or item.next_expected_date
    return RecurringItemResponse(
        id=item.id,
        merchant=item.merchant,
        name=item.name,
        amount=item.amount,
        frequency=item.frequency,
        next_due_date=due,
        next_expected_date=due,
        dueDate=due,
        category=cat_name,
        icon=item.icon,
        interval_days=item.interval_days,
        detected_automatically=item.detected_automatically,
    )


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(
    recurring_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = (
        db.query(RecurringItem)
        .filter(
            RecurringItem.id == recurring_id,
            RecurringItem.user_id == current_user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found")

    db.delete(item)
    db.commit()


@router.post("/detect", response_model=RecurringDetectResponse)
def detect_recurring_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recurring Transaction Detection Heuristic:
    1. Scan user's historical expense transactions (amount < 0).
    2. Group transactions by normalized merchant name (lowercase, stripped of numbers/symbols).
    3. For merchants with >= 2 transactions:
       - Sort transactions chronologically.
       - Calculate time intervals (in days) between consecutive occurrences.
       - Check amount consistency: verify that amounts are within a 10% tolerance (or +/- $5.00).
       - Classify frequency based on average interval:
           * 6-9 days    -> Weekly (7 days)
           * 12-17 days  -> Bi-weekly (14 days)
           * 25-35 days  -> Monthly (30 days)
           * 350-380 days -> Yearly (365 days)
    4. Automatically upsert into `RecurringItem` with `detected_automatically=True`.
    """
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.amount < 0,
        )
        .all()
    )

    merchant_txs = defaultdict(list)
    for tx in transactions:
        norm_merchant = tx.merchant.strip().lower()
        parsed_dt = parse_date_safely(tx.date)
        if parsed_dt:
            merchant_txs[norm_merchant].append((parsed_dt, abs(tx.amount), tx))

    detected_items = []

    for norm_merchant, tx_list in merchant_txs.items():
        if len(tx_list) < 2:
            continue

        # Sort chronologically
        tx_list.sort(key=lambda x: x[0])

        intervals = []
        amounts = []
        for i in range(1, len(tx_list)):
            delta_days = (tx_list[i][0] - tx_list[i - 1][0]).days
            if delta_days > 0:
                intervals.append(delta_days)
            amounts.append(tx_list[i][1])
        amounts.append(tx_list[0][1])

        if not intervals:
            continue

        avg_interval = sum(intervals) / len(intervals)
        avg_amount = sum(amounts) / len(amounts)

        # Check amount variance: all amounts within 10% or +/- $5 of average
        is_amount_consistent = all(
            abs(amt - avg_amount) <= max(5.0, avg_amount * 0.1) for amt in amounts
        )
        if not is_amount_consistent:
            continue

        # Match frequency
        frequency = None
        interval_days = 30
        if 5 <= avg_interval <= 9:
            frequency = "weekly"
            interval_days = 7
        elif 12 <= avg_interval <= 17:
            frequency = "biweekly"
            interval_days = 14
        elif 24 <= avg_interval <= 36:
            frequency = "monthly"
            interval_days = 30
        elif 340 <= avg_interval <= 380:
            frequency = "yearly"
            interval_days = 365

        if not frequency:
            continue

        latest_dt, _, sample_tx = tx_list[-1]
        next_date_dt = datetime.fromtimestamp(latest_dt.timestamp() + (interval_days * 86400))
        next_due_str = next_date_dt.strftime("%b %d, %Y")

        display_name = sample_tx.merchant.strip()

        # Check if already exists for this user and merchant
        existing = (
            db.query(RecurringItem)
            .filter(
                RecurringItem.user_id == current_user.id,
                RecurringItem.merchant.ilike(display_name),
            )
            .first()
        )

        if existing:
            existing.amount = round(avg_amount, 2)
            existing.frequency = frequency
            existing.next_due_date = next_due_str
            existing.next_expected_date = next_due_str
            existing.interval_days = interval_days
            existing.detected_automatically = True
            db.commit()
            db.refresh(existing)
            target_item = existing
        else:
            new_item = RecurringItem(
                user_id=current_user.id,
                category_id=sample_tx.category_id,
                merchant=display_name,
                name=display_name,
                amount=round(avg_amount, 2),
                frequency=frequency,
                next_due_date=next_due_str,
                next_expected_date=next_due_str,
                icon=sample_tx.icon or "subscriptions",
                interval_days=interval_days,
                detected_automatically=True,
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            target_item = new_item

        cat_name = target_item.category_rel.name if target_item.category_rel else "Subscription"
        detected_items.append(
            RecurringItemResponse(
                id=target_item.id,
                merchant=target_item.merchant,
                name=target_item.name,
                amount=target_item.amount,
                frequency=target_item.frequency,
                next_due_date=target_item.next_due_date,
                next_expected_date=target_item.next_expected_date,
                dueDate=target_item.next_due_date,
                category=cat_name,
                icon=target_item.icon or "subscriptions",
                interval_days=target_item.interval_days,
                detected_automatically=True,
            )
        )

    return RecurringDetectResponse(
        detected_count=len(detected_items),
        items=detected_items,
    )
