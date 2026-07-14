"""Authentication routes (public + token lifecycle).

Blueprint mounted at /auth. No password-reset route is defined: it is out
of scope until an email provider is chosen for the stack.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.services import auth_service
from app.services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
)
from app.schemas.user_schema import LoginSchema, SignupSchema

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

_signup_schema = SignupSchema()
_login_schema = LoginSchema()


@auth_bp.post("/signup")
def signup():
    """Create a new user. Does not auto-login (a separate /login call issues
    tokens)."""
    try:
        data = _signup_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        user = auth_service.signup(
            name=data["name"], email=data["email"], password=data["password"]
        )
    except EmailAlreadyRegisteredError:
        return jsonify({"error": "Email is already registered"}), 409

    return jsonify({"user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    """Verify credentials and return an access + refresh token pair."""
    try:
        data = _login_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        user, access_token, refresh_token = auth_service.login(
            email=data["email"], password=data["password"]
        )
    except InvalidCredentialsError:
        # Single generic message — never reveal whether email or password failed.
        return jsonify({"error": "Invalid email or password"}), 401

    return (
        jsonify(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user.to_dict(),
            }
        ),
        200,
    )


@auth_bp.post("/logout")
@jwt_required()
def logout():
    """Revoke the current access token by blocklisting its jti."""
    jti = get_jwt()["jti"]
    auth_service.logout(jti)
    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token from a valid refresh token."""
    user_id = get_jwt_identity()
    access_token = auth_service.refresh(user_id)
    return jsonify({"access_token": access_token}), 200
