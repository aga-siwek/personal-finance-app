"""User profile routes.

All routes require a valid JWT and act only on the authenticated user's own
data — there is no ``:id`` in these paths, only "me" (per CLAUDE.md's user
isolation rule).
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.schemas.user_schema import (
    ChangePasswordSchema,
    SettingsSchema,
    UpdateUserSchema,
)
from app.services import user_service
from app.services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
)
from app.utils.auth import get_current_user

users_bp = Blueprint("users", __name__, url_prefix="/users")

_update_schema = UpdateUserSchema()
_password_schema = ChangePasswordSchema()
_settings_schema = SettingsSchema()


def _current_user_or_401():
    """Load the current user, or a ready-made 401 response.

    ``@jwt_required()`` only verifies the token itself; it doesn't confirm the
    user still exists (e.g. the account could have been deleted after the
    token was issued). Every route below must check this explicitly.
    """
    user = get_current_user()
    if user is None:
        return None, (jsonify({"error": "Authentication required"}), 401)
    return user, None


@users_bp.get("/me")
@jwt_required()
def get_me():
    user, error = _current_user_or_401()
    if error:
        return error
    return jsonify({"user": user.to_dict()}), 200


@users_bp.put("/me")
@jwt_required()
def update_me():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _update_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        user = user_service.update_profile(
            user, name=data.get("name"), email=data.get("email")
        )
    except EmailAlreadyRegisteredError:
        return jsonify({"error": "Email is already registered"}), 409

    return jsonify({"user": user.to_dict()}), 200


@users_bp.put("/me/password")
@jwt_required()
def change_password():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _password_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        user_service.change_password(
            user, data["current_password"], data["new_password"]
        )
    except InvalidCredentialsError:
        return jsonify({"error": "Current password is incorrect"}), 401

    return jsonify({"message": "Password updated"}), 200


@users_bp.get("/me/settings")
@jwt_required()
def get_settings():
    user, error = _current_user_or_401()
    if error:
        return error
    return jsonify({"timezone": user.timezone}), 200


@users_bp.put("/me/settings")
@jwt_required()
def update_settings():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _settings_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    user = user_service.update_settings(user, timezone=data["timezone"])
    return jsonify({"timezone": user.timezone}), 200


@users_bp.delete("/me")
@jwt_required()
def delete_me():
    user, error = _current_user_or_401()
    if error:
        return error

    user_service.delete_account(user)
    return jsonify({"message": "Account deleted"}), 200
