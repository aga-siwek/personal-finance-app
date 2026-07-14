"""Authentication business logic.

All DB access and token issuance for auth lives here, not in the route
handlers (per CLAUDE.md: "Database queries go in models or services, never in
route handlers").
"""

from flask_jwt_extended import create_access_token, create_refresh_token

from app.extensions import bcrypt, db
from app.models.token_blocklist import TokenBlocklist
from app.models.user import User
from app.services.category_service import seed_default_categories


class AuthError(Exception):
    """Base class for auth failures the routes turn into HTTP errors."""


class EmailAlreadyRegisteredError(AuthError):
    """Raised when signup is attempted with an email that already exists."""


class InvalidCredentialsError(AuthError):
    """Raised on a failed login. Deliberately does not say which field failed."""


def _normalize_email(email):
    return email.strip().lower()


def signup(name, email, password):
    """Create a new user.

    Raises ``EmailAlreadyRegisteredError`` if the email is taken. Hashes the
    password with bcrypt, persists the user, and returns it. The password and
    resulting hash are never logged.
    """
    normalized_email = _normalize_email(email)

    existing = User.query.filter_by(email=normalized_email).first()
    if existing is not None:
        raise EmailAlreadyRegisteredError("Email is already registered")

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    user = User(
        name=name.strip(),
        email=normalized_email,
        password_hash=password_hash,
    )
    db.session.add(user)
    db.session.commit()

    # Seed the PRD §5.2 default category set so the app is usable immediately
    # without forcing setup first.
    seed_default_categories(user)

    return user


def login(email, password):
    """Verify credentials and issue an access + refresh token pair.

    Returns ``(user, access_token, refresh_token)``. Raises
    ``InvalidCredentialsError`` on any failure (unknown email OR wrong
    password) without revealing which, to avoid user enumeration.
    """
    normalized_email = _normalize_email(email)
    user = User.query.filter_by(email=normalized_email).first()

    if user is None or not bcrypt.check_password_hash(user.password_hash, password):
        raise InvalidCredentialsError("Invalid email or password")

    identity = str(user.id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)
    return user, access_token, refresh_token


def logout(jti):
    """Revoke a token by recording its ``jti`` in the blocklist.

    Idempotent: a jti already present is treated as success.
    """
    existing = TokenBlocklist.query.filter_by(jti=jti).first()
    if existing is None:
        db.session.add(TokenBlocklist(jti=jti))
        db.session.commit()


def refresh(user_id):
    """Issue a fresh access token for an already-validated refresh token.

    ``user_id`` comes from ``get_jwt_identity()`` on a refresh-verified
    request; the caller guarantees the refresh token itself is valid.
    """
    return create_access_token(identity=str(user_id))
