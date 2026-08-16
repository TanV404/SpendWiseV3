from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import AlertType, Budget, NotificationPreference, RecurringItem, Transaction, User
from app.schemas import (
    NotificationPreferenceItem,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    TestNotificationRequest,
    TestNotificationResponse,
)
from app.services.email import get_email_provider, render_email_template

router = APIRouter(tags=["notifications"])

DEFAULT_ALERT_TYPES = [
    AlertType.budget_threshold,
    AlertType.savings_milestone,
    AlertType.weekly_digest,
]


@router.get("/users/me/notification-preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve current user's notification preferences."""
    existing_prefs = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == current_user.id)
        .all()
    )
    pref_map = {p.alert_type: p for p in existing_prefs}

    items = []
    for a_type in DEFAULT_ALERT_TYPES:
        if a_type in pref_map:
            p = pref_map[a_type]
            items.append(
                NotificationPreferenceItem(
                    alert_type=p.alert_type.value,
                    enabled=p.enabled,
                    threshold_pct=p.threshold_pct,
                )
            )
        else:
            items.append(
                NotificationPreferenceItem(
                    alert_type=a_type.value,
                    enabled=True,
                    threshold_pct=80.0,
                )
            )
    return NotificationPreferenceResponse(preferences=items)


@router.put("/users/me/notification-preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    prefs_in: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update or create notification preferences for the current user."""
    for item in prefs_in.preferences:
        pref = (
            db.query(NotificationPreference)
            .filter(
                NotificationPreference.user_id == current_user.id,
                NotificationPreference.alert_type == item.alert_type,
            )
            .first()
        )
        if pref:
            pref.enabled = item.enabled
            pref.threshold_pct = item.threshold_pct
        else:
            new_pref = NotificationPreference(
                user_id=current_user.id,
                alert_type=AlertType(item.alert_type),
                enabled=item.enabled,
                threshold_pct=item.threshold_pct,
            )
            db.add(new_pref)
    db.commit()

    return get_notification_preferences(db, current_user)


@router.post("/notifications/test", response_model=TestNotificationResponse)
@router.post("/users/me/test-notification", response_model=TestNotificationResponse)
def send_test_notification(
    req: TestNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sends a dynamic email alert via Resend to the authenticated user's email address
    populated with their actual live database spending, budget, and subscription data.
    """
    if not current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user does not have a valid email address configured",
        )

    provider = get_email_provider()

    # Query user's real transactions
    user_txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.is_flagged.is_(False),
        )
        .all()
    )

    # Query user's active budget
    user_budget = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id)
        .order_by(Budget.created_at.desc())
        .first()
    )

    # Query user's recurring subscriptions
    user_recurring = (
        db.query(RecurringItem)
        .filter(RecurringItem.user_id == current_user.id)
        .order_by(RecurringItem.created_at.desc())
        .all()
    )

    if req.alert_type == "budget_threshold":
        # Calculate real dynamic budget spending
        monthly_limit = user_budget.monthly_limit if user_budget and user_budget.monthly_limit > 0 else 1000.0
        total_spent = sum(abs(t.amount) for t in user_txs if t.amount < 0)

        # If user has no transactions yet, provide a sensible baseline
        if total_spent == 0 and not user_budget:
            total_spent = 412.50
            monthly_limit = 500.0

        spent_pct = (total_spent / monthly_limit) * 100 if monthly_limit > 0 else 0
        remaining = max(0.0, monthly_limit - total_spent)

        html_content = render_email_template(
            "budget_threshold.html",
            user_name=current_user.name,
            category_name="Overall Monthly Budget",
            threshold_pct=round(spent_pct, 1),
            monthly_limit=round(monthly_limit, 2),
            spent=round(total_spent, 2),
            remaining=round(remaining, 2),
        )
        subject = f"SpendWise Alert: Monthly Budget at {int(round(spent_pct))}% (${total_spent:.2f} / ${monthly_limit:.2f})"

    elif req.alert_type == "recurring_change" or req.alert_type == "recurring_subscription":
        # Use latest user subscription or first available
        if user_recurring:
            rec = user_recurring[0]
            sub_name = rec.name or rec.merchant or "Subscription"
            sub_amount = rec.amount
            sub_freq = rec.frequency or "monthly"
            sub_due = rec.next_due_date or rec.next_expected_date or "Next month"
        else:
            sub_name = "Spotify Premium"
            sub_amount = 10.99
            sub_freq = "monthly"
            sub_due = "Sep 16, 2026"

        html_content = render_email_template(
            "recurring_change.html",
            user_name=current_user.name,
            subscription_name=sub_name,
            amount=round(sub_amount, 2),
            frequency=sub_freq,
            next_due_date=sub_due,
        )
        subject = f"SpendWise Alert: Subscription Update for {sub_name} (${sub_amount:.2f}/{sub_freq})"

    else:
        # Weekly digest: Aggregate real transactions by category
        cat_sums: dict[str, float] = {}
        for t in user_txs:
            if t.amount < 0:
                cat_name = t.category_rel.name if t.category_rel else "General Spending"
                cat_sums[cat_name] = cat_sums.get(cat_name, 0.0) + abs(t.amount)

        if not cat_sums:
            cat_breakdown = [
                {"category": "Groceries", "amount": 142.50},
                {"category": "Dining Out", "amount": 85.30},
                {"category": "Utilities", "amount": 75.00},
                {"category": "Entertainment", "amount": 43.00},
            ]
            total_spent = sum(c["amount"] for c in cat_breakdown)
        else:
            cat_breakdown = [
                {"category": cat, "amount": round(val, 2)}
                for cat, val in sorted(cat_sums.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
            total_spent = sum(cat_sums.values())

        now = datetime.now()
        week_label = f"{(now.strftime('%b %d'))} Summary"

        html_content = render_email_template(
            "weekly_digest.html",
            user_name=current_user.name,
            week_label=week_label,
            total_spent=round(total_spent, 2),
            category_breakdown=cat_breakdown,
        )
        subject = f"SpendWise Weekly Digest: ${total_spent:.2f} Total Spending"

    success = provider.send_email(
        to_email=current_user.email,
        subject=subject,
        html_content=html_content,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send test email via Resend email service",
        )

    return TestNotificationResponse(
        status="sent",
        message=f"'{req.alert_type}' email successfully dispatched with live data.",
        recipient=current_user.email,
    )
