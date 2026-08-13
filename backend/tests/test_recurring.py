def test_recurring_crud(client):
    reg = client.post(
        "/auth/register",
        json={"email": "rec@example.com", "password": "password123", "name": "Rec User"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create recurring subscription
    create_res = client.post(
        "/recurring",
        json={
            "name": "Spotify Premium",
            "amount": 10.99,
            "frequency": "monthly",
            "next_expected_date": "Jun 01, 2024",
            "category": "Entertainment",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    item_id = create_res.json()["id"]

    # 2. List recurring
    list_res = client.get("/recurring", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 3. Patch recurring
    patch_res = client.patch(
        f"/recurring/{item_id}",
        json={"amount": 11.99},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["amount"] == 11.99

    # 4. Delete recurring
    del_res = client.delete(f"/recurring/{item_id}", headers=headers)
    assert del_res.status_code == 204


def test_recurring_auto_detection_algorithm(client):
    reg = client.post(
        "/auth/register",
        json={"email": "detect@example.com", "password": "password123", "name": "Detect User"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add 3 monthly transactions for "Netflix" (spaced ~30 days apart)
    client.post(
        "/transactions",
        json={"merchant": "Netflix", "category": "Entertainment", "date": "2024-03-01", "amount": -19.99},
        headers=headers,
    )
    client.post(
        "/transactions",
        json={"merchant": "Netflix", "category": "Entertainment", "date": "2024-03-31", "amount": -19.99},
        headers=headers,
    )
    client.post(
        "/transactions",
        json={"merchant": "Netflix", "category": "Entertainment", "date": "2024-04-30", "amount": -19.99},
        headers=headers,
    )

    # Trigger detection algorithm
    detect_res = client.post("/recurring/detect", headers=headers)
    assert detect_res.status_code == 200
    detect_data = detect_res.json()

    assert detect_data["detected_count"] == 1
    item = detect_data["items"][0]
    assert item["merchant"] == "Netflix"
    assert item["frequency"] == "monthly"
    assert item["amount"] == 19.99
    assert item["detected_automatically"] is True
