"""Shared pytest fixtures.

Tests run against a file-based SQLite database, not Postgres — faster and no
Docker required locally. This is an accepted tradeoff (see CLAUDE.md / the
Auth component plan): it won't catch Postgres-specific behavior, which starts
to matter with Pots (row locking), not here.
"""

import os
import tempfile

import pytest

from app import create_app
from app.extensions import db as _db


@pytest.fixture
def app():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")

    flask_app = create_app(
        "testing",
        config_overrides={"SQLALCHEMY_DATABASE_URI": "sqlite:///{}".format(db_path)},
    )

    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def register_user(client):
    """Register + log in a user; returns a callable so tests can pick fields.

    Returns ``(user_dict, auth_headers, tokens)`` where ``auth_headers`` is
    ready to pass as ``headers=`` on an authenticated request.
    """

    def _register(name="Test User", email="test@example.com", password="password123"):
        signup_resp = client.post(
            "/auth/signup",
            json={"name": name, "email": email, "password": password},
        )
        assert signup_resp.status_code == 201, signup_resp.get_json()

        login_resp = client.post(
            "/auth/login", json={"email": email, "password": password}
        )
        assert login_resp.status_code == 200, login_resp.get_json()
        tokens = login_resp.get_json()

        headers = {"Authorization": "Bearer {}".format(tokens["access_token"])}
        return signup_resp.get_json()["user"], headers, tokens

    return _register
