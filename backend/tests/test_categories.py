def test_categories_crud_and_cascade(client):
    # Register user
    reg = client.post(
        "/auth/register",
        json={"email": "cat@example.com", "password": "password123", "name": "Cat User"},
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create new category
    create_cat = client.post(
        "/categories",
        json={"name": "Gaming", "type": "expense", "icon": "sports_esports"},
        headers=headers,
    )
    assert create_cat.status_code == 201
    cat_data = create_cat.json()
    cat_id = cat_data["id"]
    assert cat_data["name"] == "Gaming"

    # 2. Create transaction assigned to this category
    tx_res = client.post(
        "/transactions",
        json={
            "merchant": "Steam Store",
            "category": "Gaming",
            "date": "May 14, 2024",
            "amount": -59.99,
        },
        headers=headers,
    )
    assert tx_res.status_code == 201
    tx_id = tx_res.json()["id"]

    # 3. Rename category (PATCH)
    patch_res = client.patch(
        f"/categories/{cat_id}",
        json={"name": "Video Games"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Video Games"

    # 4. Delete category -> verify transactions are NOT deleted (SET NULL cascade behavior)
    del_cat = client.delete(f"/categories/{cat_id}", headers=headers)
    assert del_cat.status_code == 204

    # Verify transaction still exists and category is safely detached
    tx_list = client.get("/transactions", headers=headers).json()
    assert len(tx_list) == 1
    assert tx_list[0]["id"] == tx_id
    assert tx_list[0]["merchant"] == "Steam Store"
    assert tx_list[0]["category"] == "Other"  # Safely falls back to Other
