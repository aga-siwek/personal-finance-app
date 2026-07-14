"""Authentication helpers shared across routes and decorators."""

from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.user import User


def get_current_user():
    """Return the ``User`` for the current JWT identity, or ``None``.

    The JWT identity is the user id stored as a string (see auth_service).
    Returns ``None`` when there is no identity or the user no longer exists
    (e.g. the account was deleted after the token was issued), so callers can
    distinguish "valid token, missing user" from "authenticated user".
    """
    identity = get_jwt_identity()
    if identity is None:
        return None
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return db.session.get(User, user_id)
