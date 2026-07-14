"""Tests for /auth/* — signup, login, logout, refresh."""


def test_signup_success(client):
    resp = client.post(
        "/auth/signup",
        json={"name": "Ada Lovelace", "email": "ada@example.com", "password": "supersecret"},
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["name"] == "Ada Lovelace"
    assert body["user"]["is_admin"] is False
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_signup_duplicate_email_rejected(client, register_user):
    register_user(email="dup@example.com")

    resp = client.post(
        "/auth/signup",
        json={"name": "Someone Else", "email": "dup@example.com", "password": "password123"},
    )
    assert resp.status_code == 409


def test_signup_duplicate_email_is_case_insensitive(client, register_user):
    register_user(email="case@example.com")

    resp = client.post(
        "/auth/signup",
        json={"name": "Someone Else", "email": "CASE@Example.com", "password": "password123"},
    )
    assert resp.status_code == 409


def test_signup_weak_password_rejected(client):
    resp = client.post(
        "/auth/signup",
        json={"name": "Weak Pw", "email": "weak@example.com", "password": "short"},
    )
    assert resp.status_code == 400


def test_signup_invalid_email_rejected(client):
    resp = client.post(
        "/auth/signup",
        json={"name": "Bad Email", "email": "not-an-email", "password": "password123"},
    )
    assert resp.status_code == 400


def test_signup_does_not_auto_login(client):
    resp = client.post(
        "/auth/signup",
        json={"name": "No Auto", "email": "noauto@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    assert "access_token" not in resp.get_json()


def test_login_success(client, register_user):
    register_user(email="login@example.com", password="password123")

    resp = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert "password_hash" not in body["user"]


def test_login_wrong_password_rejected(client, register_user):
    register_user(email="wrongpw@example.com", password="password123")

    resp = client.post(
        "/auth/login",
        json={"email": "wrongpw@example.com", "password": "not-the-password"},
    )
    assert resp.status_code == 401


def test_login_unknown_email_rejected(client):
    resp = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
    )
    assert resp.status_code == 401


def test_login_error_message_does_not_reveal_which_field_was_wrong(client, register_user):
    register_user(email="generic@example.com", password="password123")

    wrong_password_resp = client.post(
        "/auth/login",
        json={"email": "generic@example.com", "password": "wrong"},
    )
    unknown_email_resp = client.post(
        "/auth/login",
        json={"email": "unknown@example.com", "password": "wrong"},
    )
    assert (
        wrong_password_resp.get_json()["error"] == unknown_email_resp.get_json()["error"]
    )


def test_logout_invalidates_the_token(client, register_user):
    _, headers, _ = register_user()

    logout_resp = client.post("/auth/logout", headers=headers)
    assert logout_resp.status_code == 200

    reuse_resp = client.get("/users/me", headers=headers)
    assert reuse_resp.status_code == 401


def test_refresh_issues_a_working_access_token(client, register_user):
    _, _, tokens = register_user()
    refresh_headers = {"Authorization": "Bearer {}".format(tokens["refresh_token"])}

    refresh_resp = client.post("/auth/refresh", headers=refresh_headers)
    assert refresh_resp.status_code == 200
    new_access_token = refresh_resp.get_json()["access_token"]

    me_resp = client.get(
        "/users/me",
        headers={"Authorization": "Bearer {}".format(new_access_token)},
    )
    assert me_resp.status_code == 200


def test_access_token_cannot_be_used_to_refresh(client, register_user):
    _, headers, _ = register_user()

    resp = client.post("/auth/refresh", headers=headers)
    assert resp.status_code == 422 or resp.status_code == 401


def test_logout_requires_auth(client):
    resp = client.post("/auth/logout")
    assert resp.status_code == 401


def test_refresh_requires_auth(client):
    resp = client.post("/auth/refresh")
    assert resp.status_code == 401
