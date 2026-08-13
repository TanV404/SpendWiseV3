def test_transaction_crud(client):
    # 1. Register user
    reg = client.post(
        "/auth/register",
        json={"email": "tx@example.com", "password": "password123", "name": "Tx User"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create transaction
    create_res = client.post(
        "/transactions",
        json={
            "merchant": "Whole Foods",
            "category": "Groceries",
            "date": "May 12, 2024",
            "amount": -142.50,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    tx_data = create_res.json()
    tx_id = tx_data["id"]
    assert tx_data["merchant"] == "Whole Foods"
    assert tx_data["amount"] == -142.50
    assert tx_data["category"] == "Groceries"

    # 3. List transactions
    list_res = client.get("/transactions", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == tx_id

    # 4. Partial update (PATCH)
    patch_res = client.patch(
        f"/transactions/{tx_id}",
        json={"amount": -150.00, "merchant": "Whole Foods Organic"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["amount"] == -150.00
    assert patch_res.json()["merchant"] == "Whole Foods Organic"

    # 5. Delete transaction
    del_res = client.delete(f"/transactions/{tx_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Verify deletion
    list_after = client.get("/transactions", headers=headers)
    assert len(list_after.json()) == 0


def test_user_data_isolation(client):
    """Confirm a user cannot read, update, or delete another user's transactions (404 isolation)."""
    # User A setup & transaction creation
    user_a = client.post(
        "/auth/register",
        json={"email": "usera@example.com", "password": "password123", "name": "User A"},
    ).json()
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}

    tx_a = client.post(
        "/transactions",
        json={"merchant": "User A Secret Store", "category": "Shopping", "date": "May 10, 2024", "amount": -89.99},
        headers=headers_a,
    ).json()
    tx_a_id = tx_a["id"]

    # User B setup
    user_b = client.post(
        "/auth/register",
        json={"email": "userb@example.com", "password": "password123", "name": "User B"},
    ).json()
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

    # 1. User B lists transactions -> must NOT see User A's transaction
    list_b = client.get("/transactions", headers=headers_b).json()
    assert not any(t["id"] == tx_a_id for t in list_b)

    # 2. User B tries to update User A's transaction -> returns 404 (no information leakage)
    patch_b = client.patch(f"/transactions/{tx_a_id}", json={"amount": -999.0}, headers=headers_b)
    assert patch_b.status_code == 404

    # 3. User B tries to delete User A's transaction -> returns 404
    del_b = client.delete(f"/transactions/{tx_a_id}", headers=headers_b)
    assert del_b.status_code == 404

    # 4. Confirm User A's transaction remains untouched
    list_a = client.get("/transactions", headers=headers_a).json()
    assert len(list_a) == 1
    assert list_a[0]["id"] == tx_a_id
    assert list_a[0]["amount"] == -89.99


def test_csv_import_with_invalid_date_filtering(client):
    reg = client.post(
        "/auth/register",
        json={"email": "csvuser@example.com", "password": "password123", "name": "CSV User"},
    ).json()
    headers = {"Authorization": f"Bearer {reg['access_token']}"}

    csv_data = """Merchant,Category,Amount,Date
Target,Groceries,-45.50,May 15 2024
Bad Row Bad Date,Shopping,-20.00,not-a-date
Bad Row Missing Amount,Groceries,,June 10 2024
Netflix,Entertainment,-15.99,2024-05-01
"""

    res = client.post("/transactions/import", json={"raw_csv": csv_data}, headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Should successfully create 2 valid transactions and report 2 errors
    assert len(data["created"]) == 2
    assert len(data["errors"]) == 2
    assert any("Invalid date format" in err["reason"] for err in data["errors"])

    # Verify transactions in database
    txs = client.get("/transactions", headers=headers).json()
    assert len(txs) == 2
    merchants = [t["merchant"] for t in txs]
    assert "Target" in merchants
    assert "Netflix" in merchants
    assert "Bad Row Bad Date" not in merchants
