def test_budget_forecasting(client):
    reg = client.post(
        "/auth/register",
        json={"email": "forecast@example.com", "password": "password123", "name": "Forecast User"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Set modest budget
    client.post(
        "/budgets",
        json={"monthly_limit": 500.0, "essential_pct": 50.0, "discretionary_pct": 30.0},
        headers=headers,
    )

    # Add significant expenses in current month
    client.post(
        "/transactions",
        json={"merchant": "Tech Store", "category": "Shopping", "date": "May 02, 2024", "amount": -200.0},
        headers=headers,
    )
    client.post(
        "/transactions",
        json={"merchant": "Restaurant", "category": "Dining Out", "date": "May 03, 2024", "amount": -150.0},
        headers=headers,
    )

    forecast_res = client.get("/budgets/forecast", headers=headers)
    assert forecast_res.status_code == 200
    f_data = forecast_res.json()

    assert "daily_burn_rate" in f_data
    assert "current_spend" in f_data
    assert f_data["current_spend"] == 350.0
    assert f_data["monthly_budget"] == 500.0
    assert "over_budget_risk" in f_data
    assert f_data["status"] in ["UNDER_BUDGET", "NEAR_BUDGET", "OVER_BUDGET"]
