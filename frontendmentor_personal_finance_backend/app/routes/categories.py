"""Category routes.

All routes require a valid JWT and act only on the authenticated user's own
categories, per CLAUDE.md's user isolation rule.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.schemas.category_schema import CategorySchema
from app.services import category_service
from app.services.category_service import (
    CategoryAlreadyExistsError,
    CategoryInUseError,
    CategoryNotFoundError,
)
from app.utils.auth import get_current_user

categories_bp = Blueprint("categories", __name__, url_prefix="/categories")

_category_schema = CategorySchema()


def _current_user_or_401():
    user = get_current_user()
    if user is None:
        return None, (jsonify({"error": "Authentication required"}), 401)
    return user, None


@categories_bp.get("")
@jwt_required()
def list_categories():
    user, error = _current_user_or_401()
    if error:
        return error

    categories = category_service.list_categories(user)
    return jsonify({"categories": [c.to_dict() for c in categories]}), 200


@categories_bp.post("")
@jwt_required()
def create_category():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _category_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        category = category_service.create_category(user, name=data["name"])
    except CategoryAlreadyExistsError:
        return jsonify({"error": "Category name already exists"}), 409

    return jsonify({"category": category.to_dict()}), 201


@categories_bp.get("/<int:category_id>")
@jwt_required()
def get_category(category_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        category = category_service.get_category(user, category_id)
    except CategoryNotFoundError:
        return jsonify({"error": "Category not found"}), 404

    return jsonify({"category": category.to_dict()}), 200


@categories_bp.put("/<int:category_id>")
@jwt_required()
def update_category(category_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _category_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        category = category_service.update_category(
            user, category_id, name=data["name"]
        )
    except CategoryNotFoundError:
        return jsonify({"error": "Category not found"}), 404
    except CategoryAlreadyExistsError:
        return jsonify({"error": "Category name already exists"}), 409

    return jsonify({"category": category.to_dict()}), 200


@categories_bp.delete("/<int:category_id>")
@jwt_required()
def delete_category(category_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        category_service.delete_category(user, category_id)
    except CategoryNotFoundError:
        return jsonify({"error": "Category not found"}), 404
    except CategoryInUseError:
        return (
            jsonify(
                {
                    "error": "Category is still referenced by a transaction or "
                    "budget and cannot be deleted"
                }
            ),
            409,
        )

    return jsonify({"message": "Category deleted"}), 200
