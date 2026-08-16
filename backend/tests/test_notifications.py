import pytest

from app.models import (
    AlertType,
    Budget,
    Category,
    CategoryType,
    NotificationPreference,
    Transaction,
    User,
)
from app.services.alerts import check_budget_threshold, check_savings_milestone
from app.services.email import FakeEmailProvider, set_email_provider


@pytest.fixture(autouse=True)
def fake_email():
    provider = FakeEmailProvider()
    set_email_provider(provider)
    yield provider
    provider.clear()


def test_notification_preferences_crud(client):
    # 1. Register and get token
    reg = client.post(
        "/auth/register",
        json={"email": "notif_user@example.com", "password": "password123", "name": "Notif User"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get default preferences
    get_res = client.get("/users/me/notification-preferences", headers=headers)
    assert get_res.status_code == 200
    prefs = get_res.json()["preferences"]
    assert len(prefs) == 3
    types = {p["alert_type"] for p in prefs}
    assert types == {"budget_threshold", "savings_milestone", "weekly_digest"}
    assert all(p["enabled"] is True for p in prefs)

    # 3. Update preferences
    update_payload = {
        "preferences": [
            {"alert_type": "budget_threshold", "enabled": True, "threshold_pct": 90.0},
            {"alert_type": "weekly_digest", "enabled": False, "threshold_pct": 80.0},
        ]
    }
    put_res = client.put("/users/me/notification-preferences", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    updated_prefs = put_res.json()["preferences"]
    budget_pref = next(p for p in updated_prefs if p["alert_type"] == "budget_threshold")
    digest_pref = next(p for p in updated_prefs if p["alert_type"] == "weekly_digest")
    assert budget_pref["threshold_pct"] == 90.0
    assert digest_pref["enabled"] is False


def test_test_notification_endpoint(client, fake_email):
    # Register user
    reg = client.post(
        "/auth/register",
        json={"email": "tester@example.com", "password": "password123", "name": "Test Tester"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Send test notification for budget threshold
    res = client.post(
        "/notifications/test",
        json={"alert_type": "budget_threshold"},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "sent"
    assert data["recipient"] == "tester@example.com"

    # Assert FakeEmailProvider recorded email
    assert len(fake_email.sent_emails) == 1
    sent = fake_email.sent_emails[0]
    assert sent["to_email"] == "tester@example.com"
    assert "Budget" in sent["subject"]
    assert "Test Tester" in sent["html_content"]


def test_budget_threshold_unit_and_idempotency(db_session, fake_email):
    # 1. Create User
    user = User(id="user-123", email="budget_alert@example.com", password_hash="hash", name="Budget User")
    db_session.add(user)
    db_session.commit()

    # 2. Create Category & Budget of $100 with default 80% threshold
    cat = Category(id="cat-dining", user_id=user.id, name="Dining Out", type=CategoryType.expense)
    budget = Budget(id="b-1", user_id=user.id, category_id=cat.id, monthly_limit=100.0)
    pref = NotificationPreference(
        user_id=user.id,
        alert_type=AlertType.budget_threshold,
        enabled=True,
        threshold_pct=80.0,
    )
    db_session.add_all([cat, budget, pref])
    db_session.commit()

    # 3. Add transaction $50 (50% < 80% threshold) -> No alert
    tx1 = Transaction(user_id=user.id, category_id=cat.id, merchant="Cafe", date="May 1, 2024", amount=-50.0)
    db_session.add(tx1)
    db_session.commit()

    check_budget_threshold(user.id, cat.id, db_session)
    assert len(fake_email.sent_emails) == 0

    # 4. Add transaction $35 (Total $85 = 85% >= 80% threshold) -> 1 Alert sent
    tx2 = Transaction(user_id=user.id, category_id=cat.id, merchant="Bistro", date="May 2, 2024", amount=-35.0)
    db_session.add(tx2)
    db_session.commit()

    check_budget_threshold(user.id, cat.id, db_session)
    assert len(fake_email.sent_emails) == 1
    assert "Dining Out has reached 80% of monthly budget" in fake_email.sent_emails[0]["subject"]

    # 5. Idempotency test: Add another transaction in the same period ($10 more -> Total $95)
    tx3 = Transaction(user_id=user.id, category_id=cat.id, merchant="Diner", date="May 3, 2024", amount=-10.0)
    db_session.add(tx3)
    db_session.commit()

    check_budget_threshold(user.id, cat.id, db_session)
    # MUST still be 1 (no duplicate send!)
    assert len(fake_email.sent_emails) == 1


def test_savings_milestone_alert(db_session, fake_email):
    # 1. Create User
    user = User(id="user-save", email="saver@example.com", password_hash="hash", name="Saver")
    pref = NotificationPreference(
        user_id=user.id,
        alert_type=AlertType.savings_milestone,
        enabled=True,
        threshold_pct=25.0,
    )
    db_session.add_all([user, pref])
    db_session.commit()

    # 2. Check 50% milestone on a $10,000 goal with $5,000 saved
    check_savings_milestone(
        user_id=user.id,
        goal_id="goal-vacation",
        current_savings=5000.0,
        target_amount=10000.0,
        goal_name="Vacation Fund",
        db=db_session,
    )

    # 25% and 50% milestones are both reached
    assert len(fake_email.sent_emails) == 2
    subjects = [e["subject"] for e in fake_email.sent_emails]
    assert any("25%" in s for s in subjects)
    assert any("50%" in s for s in subjects)

    # Second check without savings change -> 0 new emails (idempotent)
    check_savings_milestone(
        user_id=user.id,
        goal_id="goal-vacation",
        current_savings=5000.0,
        target_amount=10000.0,
        goal_name="Vacation Fund",
        db=db_session,
    )
    assert len(fake_email.sent_emails) == 2
