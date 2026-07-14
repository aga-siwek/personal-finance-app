"""Tests for /users/me* — profile, password, settings, account deletion."""


def test_get_profile(client, register_user):
    _, headers, _ = register_user(name="Grace Hopper", email="grace@example.com")

    resp = client.get("/users/me", headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()["user"]
    assert body["name"] == "Grace Hopper"
    assert body["email"] == "grace@example.com"
    assert body["timezone"] == "UTC"
    assert "password_hash" not in body


def test_get_profile_requires_auth(client):
    resp = client.get("/users/me")
    assert resp.status_code == 401


def test_update_profile_name(client, register_user):
    _, headers, _ = register_user()

    resp = client.put("/users/me", json={"name": "New Name"}, headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["user"]["name"] == "New Name"


def test_update_profile_email(client, register_user):
    _, headers, _ = register_user(email="old@example.com")

    resp = client.put(
        "/users/me", json={"email": "new@example.com"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == "new@example.com"


def test_update_profile_email_already_taken(client, register_user):
    register_user(email="taken@example.com")
    _, headers, _ = register_user(email="mine@example.com")

    resp = client.put(
        "/users/me", json={"email": "taken@example.com"}, headers=headers
    )
    assert resp.status_code == 409


def test_update_profile_empty_body_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = client.put("/users/me", json={}, headers=headers)
    assert resp.status_code == 400


def test_update_profile_requires_auth(client):
    resp = client.put("/users/me", json={"name": "Nope"})
    assert resp.status_code == 401


def test_change_password_success(client, register_user):
    _, headers, _ = register_user(email="pwchange@example.com", password="oldpassword")

    resp = client.put(
        "/users/me/password",
        json={"current_password": "oldpassword", "new_password": "newpassword123"},
        headers=headers,
    )
    assert resp.status_code == 200

    old_login = client.post(
        "/auth/login",
        json={"email": "pwchange@example.com", "password": "oldpassword"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login",
        json={"email": "pwchange@example.com", "password": "newpassword123"},
    )
    assert new_login.status_code == 200


def test_change_password_wrong_current_password_rejected(client, register_user):
    _, headers, _ = register_user(password="correctpassword")

    resp = client.put(
        "/users/me/password",
        json={"current_password": "wrongpassword", "new_password": "newpassword123"},
        headers=headers,
    )
    assert resp.status_code == 401


def test_change_password_requires_auth(client):
    resp = client.put(
        "/users/me/password",
        json={"current_password": "a", "new_password": "newpassword123"},
    )
    assert resp.status_code == 401


def test_get_settings_defaults_to_utc(client, register_user):
    _, headers, _ = register_user()

    resp = client.get("/users/me/settings", headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["timezone"] == "UTC"


def test_update_settings_timezone(client, register_user):
    _, headers, _ = register_user()

    resp = client.put(
        "/users/me/settings",
        json={"timezone": "Europe/Warsaw"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["timezone"] == "Europe/Warsaw"

    get_resp = client.get("/users/me/settings", headers=headers)
    assert get_resp.get_json()["timezone"] == "Europe/Warsaw"


def test_update_settings_invalid_timezone_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = client.put(
        "/users/me/settings",
        json={"timezone": "Not/A_Real_Zone"},
        headers=headers,
    )
    assert resp.status_code == 400


def test_settings_requires_auth(client):
    resp = client.get("/users/me/settings")
    assert resp.status_code == 401


def test_delete_account(client, register_user):
    _, headers, tokens = register_user(email="deleteme@example.com", password="password123")

    resp = client.delete("/users/me", headers=headers)
    assert resp.status_code == 200

    login_resp = client.post(
        "/auth/login",
        json={"email": "deleteme@example.com", "password": "password123"},
    )
    assert login_resp.status_code == 401

    me_resp = client.get("/users/me", headers=headers)
    assert me_resp.status_code == 401


def test_delete_account_requires_auth(client):
    resp = client.delete("/users/me")
    assert resp.status_code == 401
