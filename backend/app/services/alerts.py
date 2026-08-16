import logging
from datetime import datetime, timezone

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.models import (
    AlertSent,
    AlertType,
    Budget,
    Category,
    NotificationPreference,
    Transaction,
    User,
)
from app.services.email import get_email_provider, render_email_template

logger = logging.getLogger(__name__)


def get_current_period() -> str:
    """Returns current period string in 'YYYY-MM' format."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def send_budget_alert_task(
    user_id: str,
    user_email: str,
    user_name: str,
    category_name: str,
    category_id: str | None,
    threshold_pct: float,
    monthly_limit: float,
    spent: float,
    remaining: float,
    period: str,
    db: Session | None = None,
):
    """Background task to send budget alert email and record in alerts_sent on success."""
    provider = get_email_provider()
    html_content = render_email_template(
        "budget_threshold.html",
        user_name=user_name,
        category_name=category_name,
        threshold_pct=threshold_pct,
        monthly_limit=monthly_limit,
        spent=spent,
        remaining=remaining,
    )
    subject = f"SpendWise Alert: {category_name} has reached {int(threshold_pct)}% of monthly budget"

    success = provider.send_email(
        to_email=user_email,
        subject=subject,
        html_content=html_content,
    )

    if success:
        close_db = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            close_db = True

        try:
            # Re-check and insert into alerts_sent
            existing = (
                db.query(AlertSent)
                .filter(
                    AlertSent.user_id == user_id,
                    AlertSent.alert_type == AlertType.budget_threshold,
                    AlertSent.reference_id == category_id,
                    AlertSent.period == period,
                    AlertSent.threshold_hit == threshold_pct,
                )
                .first()
            )
            if not existing:
                alert = AlertSent(
                    user_id=user_id,
                    alert_type=AlertType.budget_threshold,
                    reference_id=category_id,
                    period=period,
                    threshold_hit=threshold_pct,
                )
                db.add(alert)
                db.commit()
                logger.info("Recorded budget alert sent for user %s, category %s", user_id, category_name)
        except Exception as e:
            db.rollback()
            logger.error("Failed to record AlertSent in db: %s", e)
        finally:
            if close_db:
                db.close()


def send_savings_milestone_task(
    user_id: str,
    user_email: str,
    user_name: str,
    goal_id: str | None,
    goal_name: str,
    milestone_pct: float,
    current_savings: float,
    target_amount: float,
    remaining_to_save: float,
    period: str,
    db: Session | None = None,
):
    """Background task to send savings milestone email and record in alerts_sent on success."""
    provider = get_email_provider()
    html_content = render_email_template(
        "savings_milestone.html",
        user_name=user_name,
        goal_name=goal_name,
        milestone_pct=milestone_pct,
        current_savings=current_savings,
        target_amount=target_amount,
        remaining_to_save=remaining_to_save,
    )
    subject = f"🎉 Milestone Achieved: {int(milestone_pct)}% of your savings goal reached!"

    success = provider.send_email(
        to_email=user_email,
        subject=subject,
        html_content=html_content,
    )

    if success:
        close_db = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            close_db = True

        try:
            existing = (
                db.query(AlertSent)
                .filter(
                    AlertSent.user_id == user_id,
                    AlertSent.alert_type == AlertType.savings_milestone,
                    AlertSent.reference_id == goal_id,
                    AlertSent.period == period,
                    AlertSent.threshold_hit == milestone_pct,
                )
                .first()
            )
            if not existing:
                alert = AlertSent(
                    user_id=user_id,
                    alert_type=AlertType.savings_milestone,
                    reference_id=goal_id,
                    period=period,
                    threshold_hit=milestone_pct,
                )
                db.add(alert)
                db.commit()
                logger.info("Recorded savings milestone sent for user %s, milestone %s%%", user_id, milestone_pct)
        except Exception as e:
            db.rollback()
            logger.error("Failed to record savings milestone AlertSent in db: %s", e)
        finally:
            if close_db:
                db.close()


def check_budget_threshold(
    user_id: str,
    category_id: str | None,
    db: Session,
    background_tasks: BackgroundTasks | None = None,
):
    """
    Recomputes % of category budget spent, compares against user's threshold_pct preference,
    checks alerts_sent for deduplication/idempotency, and queues background email task.
    """
    # 1. Fetch user notification preference
    pref = (
        db.query(NotificationPreference)
        .filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.alert_type == AlertType.budget_threshold,
        )
        .first()
    )
    if pref and not pref.enabled:
        return

    threshold_pct = pref.threshold_pct if pref else 80.0

    # 2. Find budget for this category (or overall)
    budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
        )
        .first()
    )
    if not budget or budget.monthly_limit <= 0:
        return

    # 3. Calculate current month's spent amount for this category
    period = get_current_period()
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
        )
        .all()
    )
    spent = sum(abs(tx.amount) for tx in transactions if tx.amount < 0)
    spent_pct = (spent / budget.monthly_limit) * 100.0

    if spent_pct < threshold_pct:
        return

    # 4. Check alerts_sent for idempotency (already sent this period for this threshold)
    already_sent = (
        db.query(AlertSent)
        .filter(
            AlertSent.user_id == user_id,
            AlertSent.alert_type == AlertType.budget_threshold,
            AlertSent.reference_id == category_id,
            AlertSent.period == period,
            AlertSent.threshold_hit == threshold_pct,
        )
        .first()
    )
    if already_sent:
        logger.info(
            "Budget threshold alert already sent for user %s, category %s in %s",
            user_id,
            category_id,
            period,
        )
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.email:
        return

    cat_name = "Overall"
    if category_id:
        cat = db.query(Category).filter(Category.id == category_id).first()
        if cat:
            cat_name = cat.name

    remaining = max(0.0, budget.monthly_limit - spent)

    # 5. Dispatch background task
    if background_tasks is not None:
        background_tasks.add_task(
            send_budget_alert_task,
            user_id=user.id,
            user_email=user.email,
            user_name=user.name,
            category_name=cat_name,
            category_id=category_id,
            threshold_pct=threshold_pct,
            monthly_limit=budget.monthly_limit,
            spent=spent,
            remaining=remaining,
            period=period,
        )
    else:
        send_budget_alert_task(
            user_id=user.id,
            user_email=user.email,
            user_name=user.name,
            category_name=cat_name,
            category_id=category_id,
            threshold_pct=threshold_pct,
            monthly_limit=budget.monthly_limit,
            spent=spent,
            remaining=remaining,
            period=period,
            db=db,
        )


def check_savings_milestone(
    user_id: str,
    goal_id: str | None,
    current_savings: float,
    target_amount: float,
    goal_name: str,
    db: Session,
    background_tasks: BackgroundTasks | None = None,
):
    """
    Checks if savings reaches milestone brackets (25, 50, 75, 100%),
    checks alerts_sent for idempotency, and queues background email task.
    """
    if target_amount <= 0:
        return

    pref = (
        db.query(NotificationPreference)
        .filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.alert_type == AlertType.savings_milestone,
        )
        .first()
    )
    if pref and not pref.enabled:
        return

    pct_achieved = (current_savings / target_amount) * 100.0
    milestones = [25.0, 50.0, 75.0, 100.0]
    period = get_current_period()

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.email:
        return

    for milestone in milestones:
        if pct_achieved >= milestone:
            already_sent = (
                db.query(AlertSent)
                .filter(
                    AlertSent.user_id == user_id,
                    AlertSent.alert_type == AlertType.savings_milestone,
                    AlertSent.reference_id == goal_id,
                    AlertSent.period == period,
                    AlertSent.threshold_hit == milestone,
                )
                .first()
            )
            if not already_sent:
                remaining_to_save = max(0.0, target_amount - current_savings)
                if background_tasks is not None:
                    background_tasks.add_task(
                        send_savings_milestone_task,
                        user_id=user.id,
                        user_email=user.email,
                        user_name=user.name,
                        goal_id=goal_id,
                        goal_name=goal_name,
                        milestone_pct=milestone,
                        current_savings=current_savings,
                        target_amount=target_amount,
                        remaining_to_save=remaining_to_save,
                        period=period,
                    )
                else:
                    send_savings_milestone_task(
                        user_id=user.id,
                        user_email=user.email,
                        user_name=user.name,
                        goal_id=goal_id,
                        goal_name=goal_name,
                        milestone_pct=milestone,
                        current_savings=current_savings,
                        target_amount=target_amount,
                        remaining_to_save=remaining_to_save,
                        period=period,
                        db=db,
                    )
