def test_register_and_login(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "demo@example.com", "password": "s3cret-pass", "full_name": "Demo User"},
    )
    assert response.status_code == 201
    assert response.json()["email"] == "demo@example.com"

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "demo@example.com", "password": "s3cret-pass"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "demo@example.com"


def test_login_rejects_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "demo2@example.com", "password": "s3cret-pass"},
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "demo2@example.com", "password": "wrong"},
    )
    assert response.status_code == 401
