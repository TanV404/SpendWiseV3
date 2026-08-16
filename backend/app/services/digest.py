import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AlertSent,
    AlertType,
    NotificationPreference,
    Transaction,
    User,
)
from app.services.email import get_email_provider, render_email_template

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def run_weekly_digest_job():
    """
    Weekly digest runner: Runs every Monday at 8:00 AM server time.
    Aggregates prior week's spend per category per user and sends via Resend.
    """
    logger.info("Starting weekly financial digest job...")
    db: Session = SessionLocal()
    provider = get_email_provider()

    try:
        # Prior 7 days range
        now = datetime.now(timezone.utc)
        week_end = now
        week_start = now - timedelta(days=7)
        week_label = f"{week_start.strftime('%b %d')} - {week_end.strftime('%b %d, %Y')}"
        period_key = f"week-{week_start.strftime('%Y-%W')}"

        users = db.query(User).all()
        for user in users:
            pref = (
                db.query(NotificationPreference)
                .filter(
                    NotificationPreference.user_id == user.id,
                    NotificationPreference.alert_type == AlertType.weekly_digest,
                )
                .first()
            )
            # Default to enabled if not explicitly configured
            if pref and not pref.enabled:
                continue

            # Idempotency check for this weekly period
            already_sent = (
                db.query(AlertSent)
                .filter(
                    AlertSent.user_id == user.id,
                    AlertSent.alert_type == AlertType.weekly_digest,
                    AlertSent.period == period_key,
                )
                .first()
            )
            if already_sent:
                continue

            transactions = (
                db.query(Transaction)
                .filter(Transaction.user_id == user.id)
                .all()
            )

            # Aggregate expenses for prior week
            total_spent = 0.0
            cat_totals = {}

            for tx in transactions:
                if tx.amount < 0:
                    amt = abs(tx.amount)
                    total_spent += amt
                    cat_name = tx.category_rel.name if tx.category_rel else "Other"
                    cat_totals[cat_name] = cat_totals.get(cat_name, 0.0) + amt

            breakdown = [
                {"category": cat, "amount": amt}
                for cat, amt in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
            ]

            html_content = render_email_template(
                "weekly_digest.html",
                user_name=user.name,
                week_label=week_label,
                total_spent=total_spent,
                category_breakdown=breakdown,
            )
            subject = f"SpendWise Weekly Spending Digest ({week_label})"

            success = provider.send_email(
                to_email=user.email,
                subject=subject,
                html_content=html_content,
            )

            if success:
                alert = AlertSent(
                    user_id=user.id,
                    alert_type=AlertType.weekly_digest,
                    period=period_key,
                    threshold_hit=100.0,
                )
                db.add(alert)
                db.commit()
                logger.info("Sent weekly digest to user %s (%s)", user.id, user.email)

    except Exception as e:
        logger.error("Error running weekly digest job: %s", e)
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Initializes and starts APScheduler for weekly digest."""
    if not scheduler.running:
        scheduler.add_job(
            run_weekly_digest_job,
            "cron",
            day_of_week="mon",
            hour=8,
            minute=0,
            id="weekly_digest_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started with weekly digest job (Monday 8:00 AM)")


def shutdown_scheduler():
    """Shuts down APScheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
