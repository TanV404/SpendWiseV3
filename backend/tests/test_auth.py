def test_register_and_login_flow(client):
    # 1. Register new user
    reg_res = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "securepassword123", "name": "Alice Rivera"},
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["name"] == "Alice Rivera"

    # 2. Login with correct password
    login_res = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "securepassword123"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    # 3. Login with invalid password -> 401
    bad_login = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401
    assert "detail" in bad_login.json()

    # 4. Duplicate registration -> 400
    dup_reg = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "anotherpassword", "name": "Alice 2"},
    )
    assert dup_reg.status_code == 400


def test_login_oauth2_form(client):
    # Register user
    client.post(
        "/auth/register",
        json={"email": "bob@example.com", "password": "password123", "name": "Bob"},
    )

    # Login with form data
    res = client.post(
        "/auth/login",
        data={"username": "bob@example.com", "password": "password123"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_auth_me_endpoint(client):
    # Register user
    reg = client.post(
        "/auth/register",
        json={"email": "carol@example.com", "password": "password123", "name": "Carol"},
    ).json()

    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "carol@example.com"

    # Unauthorized access -> 401
    bad_me = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert bad_me.status_code == 401
