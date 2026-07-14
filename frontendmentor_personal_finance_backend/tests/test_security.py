"""Security-focused tests for the Auth/User component.

Covers the subset of CLAUDE.md's security-check checklist relevant here:
SQL injection prevention (ORM parameterization), broken-auth resistance
(tampered/malformed JWTs, the @require_admin decorator), and never leaking
password_hash.
"""

from flask import Blueprint, jsonify

from app.utils.decorators import require_admin


def test_login_sql_injection_attempt_rejected_by_validation(client):
    """An injection-shaped string isn't a valid email, so it never reaches
    the database — schema validation is the first line of defense."""
    resp = client.post(
        "/auth/login",
        json={"email": "' OR '1'='1' --", "password": "irrelevant"},
    )
    assert resp.status_code == 400


def test_email_with_quote_character_handled_safely_by_orm(client):
    """A syntactically valid email containing a quote must work normally —
    proving the ORM parameterizes values instead of interpolating them."""
    signup_resp = client.post(
        "/auth/signup",
        json={
            "name": "O'Brien",
            "email": "o'brien@example.com",
            "password": "password123",
        },
    )
    assert signup_resp.status_code == 201

    login_resp = client.post(
        "/auth/login",
        json={"email": "o'brien@example.com", "password": "password123"},
    )
    assert login_resp.status_code == 200


def test_tampered_jwt_signature_rejected(client, register_user):
    _, headers, _ = register_user()
    token = headers["Authorization"].split(" ", 1)[1]

    # Flip the last character of the signature so it no longer validates.
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
    resp = client.get(
        "/users/me", headers={"Authorization": "Bearer {}".format(tampered)}
    )
    # Flask-JWT-Extended returns 422 for a structurally-present-but-invalid
    # token (bad signature) vs. 401 for a missing token — either way access
    # is denied, which is what this test actually verifies.
    assert resp.status_code == 422


def test_malformed_authorization_header_rejected(client, register_user):
    _, headers, _ = register_user()
    token = headers["Authorization"].split(" ", 1)[1]

    resp = client.get(
        "/users/me", headers={"Authorization": token}  # missing "Bearer "
    )
    assert resp.status_code in (401, 422)


def test_no_token_rejected(client):
    resp = client.get("/users/me")
    assert resp.status_code == 401


def test_password_hash_never_in_signup_response(client):
    resp = client.post(
        "/auth/signup",
        json={"name": "No Leak", "email": "noleak@example.com", "password": "password123"},
    )
    assert "password_hash" not in resp.get_data(as_text=True)
    assert "password" not in resp.get_json()["user"]


def test_password_hash_never_in_login_response(client, register_user):
    register_user(email="noleak2@example.com", password="password123")

    resp = client.post(
        "/auth/login",
        json={"email": "noleak2@example.com", "password": "password123"},
    )
    assert "password_hash" not in resp.get_data(as_text=True)


def test_password_hash_never_in_profile_response(client, register_user):
    _, headers, _ = register_user()

    resp = client.get("/users/me", headers=headers)
    assert "password_hash" not in resp.get_data(as_text=True)


def test_require_admin_decorator(app, client, register_user):
    """Exercises @require_admin directly: no token -> 401, non-admin -> 403,
    admin -> 200. No admin routes exist yet (Admin is a later component), so
    this registers a throwaway route on the test app to protect the
    decorator itself with a regression test now, since CLAUDE.md scopes it
    as foundational, costly-to-get-wrong infra."""
    probe_bp = Blueprint("admin_probe", __name__)

    @probe_bp.get("/_test/admin-only")
    @require_admin
    def admin_only():
        return jsonify({"ok": True}), 200

    app.register_blueprint(probe_bp)

    no_token_resp = client.get("/_test/admin-only")
    assert no_token_resp.status_code == 401

    _, headers, _ = register_user(email="notadmin@example.com")
    non_admin_resp = client.get("/_test/admin-only", headers=headers)
    assert non_admin_resp.status_code == 403

    from app.extensions import db
    from app.models.user import User

    user = User.query.filter_by(email="notadmin@example.com").first()
    user.is_admin = True
    db.session.commit()

    admin_login = client.post(
        "/auth/login",
        json={"email": "notadmin@example.com", "password": "password123"},
    )
    admin_headers = {
        "Authorization": "Bearer {}".format(admin_login.get_json()["access_token"])
    }

    admin_resp = client.get("/_test/admin-only", headers=admin_headers)
    assert admin_resp.status_code == 200
