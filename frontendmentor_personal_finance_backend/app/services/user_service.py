"""User profile business logic.

All DB access lives here, not in route handlers (per CLAUDE.md).
"""

from app.extensions import bcrypt, db
from app.models.user import User
from app.services.auth_service import EmailAlreadyRegisteredError, InvalidCredentialsError


def _normalize_email(email):
    return email.strip().lower()


def update_profile(user, name=None, email=None):
    """Update the current user's name and/or email.

    Raises ``EmailAlreadyRegisteredError`` if ``email`` is changed to one
    already used by a different user.
    """
    if name is not None:
        user.name = name.strip()

    if email is not None:
        normalized_email = _normalize_email(email)
        if normalized_email != user.email:
            existing = User.query.filter(
                User.email == normalized_email, User.id != user.id
            ).first()
            if existing is not None:
                raise EmailAlreadyRegisteredError("Email is already registered")
            user.email = normalized_email

    db.session.commit()
    return user


def change_password(user, current_password, new_password):
    """Change the user's password after verifying the current one.

    Raises ``InvalidCredentialsError`` if ``current_password`` is wrong.
    """
    if not bcrypt.check_password_hash(user.password_hash, current_password):
        raise InvalidCredentialsError("Current password is incorrect")

    user.password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()
    return user


def update_settings(user, timezone):
    """Update user settings. v1 settings is timezone only (see schema note)."""
    user.timezone = timezone
    db.session.commit()
    return user


def delete_account(user):
    """Permanently delete the user's own account."""
    db.session.delete(user)
    db.session.commit()
