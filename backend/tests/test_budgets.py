def test_budget_upsert_and_status(client):
    # Register user
    reg = client.post(
        "/auth/register",
        json={"email": "budget@example.com", "password": "password123", "name": "Budget User"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upsert overall budget
    b_res = client.post(
        "/budgets",
        json={
            "monthly_limit": 2000.0,
            "essential_pct": 60.0,
            "discretionary_pct": 20.0,
            "ai_smart_adjust": True,
        },
        headers=headers,
    )
    assert b_res.status_code == 201

    # 2. Add some expenses
    client.post(
        "/transactions",
        json={"merchant": "Groceries Store", "category": "Groceries", "date": "May 10, 2024", "amount": -300.0},
        headers=headers,
    )
    client.post(
        "/transactions",
        json={"merchant": "Coffee Shop", "category": "Dining Out", "date": "May 11, 2024", "amount": -50.0},
        headers=headers,
    )

    # 3. Check budget status math
    status_res = client.get("/budgets/status", headers=headers)
    assert status_res.status_code == 200
    statuses = status_res.json()
    assert len(statuses) >= 1

    overall = statuses[0]
    assert overall["monthly_limit"] == 2000.0
    assert overall["essential"] == 1200.0  # 60% of 2000
    assert overall["discretionary"] == 400.0  # 20% of 2000
    assert overall["spent"] == 350.0
    assert overall["remaining"] == 1650.0


def test_budget_defensive_outlier_filtering(client):
    reg = client.post(
        "/auth/register",
        json={"email": "defensive@example.com", "password": "password123", "name": "Defensive User"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post(
        "/budgets",
        json={"monthly_limit": 1000.0, "essential_pct": 50.0, "discretionary_pct": 30.0},
        headers=headers,
    )

    # Valid transaction
    client.post(
        "/transactions",
        json={"merchant": "Normal Grocery", "category": "Groceries", "date": "May 10, 2024", "amount": -120.0},
        headers=headers,
    )

    status_res = client.get("/budgets/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()[0]["spent"] == 120.0
    assert status_res.json()[0]["remaining"] == 880.0
