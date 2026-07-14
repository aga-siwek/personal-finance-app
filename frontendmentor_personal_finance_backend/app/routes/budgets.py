"""Budget routes.

All routes require a valid JWT and act only on the authenticated user's own
budgets, per CLAUDE.md's user isolation rule.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.schemas.budget_schema import BudgetCreateSchema, BudgetUpdateSchema
from app.services import budget_service
from app.services.budget_service import (
    BudgetAlreadyExistsError,
    BudgetNotFoundError,
    CategoryNotFoundError,
)
from app.utils.auth import get_current_user

budgets_bp = Blueprint("budgets", __name__, url_prefix="/budgets")

_create_schema = BudgetCreateSchema()
_update_schema = BudgetUpdateSchema()


def _current_user_or_401():
    user = get_current_user()
    if user is None:
        return None, (jsonify({"error": "Authentication required"}), 401)
    return user, None


@budgets_bp.get("")
@jwt_required()
def list_budgets():
    user, error = _current_user_or_401()
    if error:
        return error

    budgets = budget_service.list_budgets(user)
    return (
        jsonify(
            {
                "budgets": [
                    budget_service.budget_to_response_dict(user, b) for b in budgets
                ]
            }
        ),
        200,
    )


@budgets_bp.post("")
@jwt_required()
def create_budget():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        budget = budget_service.create_budget(
            user,
            category_id=data["category_id"],
            max_spend=data["max_spend"],
            theme=data["theme"],
        )
    except CategoryNotFoundError:
        return jsonify({"error": "Category not found"}), 400
    except BudgetAlreadyExistsError:
        return jsonify({"error": "A budget already exists for this category"}), 409

    return (
        jsonify({"budget": budget_service.budget_to_response_dict(user, budget)}),
        201,
    )


@budgets_bp.get("/<int:budget_id>")
@jwt_required()
def get_budget(budget_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        budget = budget_service.get_budget(user, budget_id)
    except BudgetNotFoundError:
        return jsonify({"error": "Budget not found"}), 404

    return jsonify({"budget": budget_service.budget_to_response_dict(user, budget)}), 200


@budgets_bp.put("/<int:budget_id>")
@jwt_required()
def update_budget(budget_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _update_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        budget = budget_service.update_budget(
            user,
            budget_id,
            max_spend=data.get("max_spend"),
            theme=data.get("theme"),
        )
    except BudgetNotFoundError:
        return jsonify({"error": "Budget not found"}), 404

    return jsonify({"budget": budget_service.budget_to_response_dict(user, budget)}), 200


@budgets_bp.delete("/<int:budget_id>")
@jwt_required()
def delete_budget(budget_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        budget_service.delete_budget(user, budget_id)
    except BudgetNotFoundError:
        return jsonify({"error": "Budget not found"}), 404

    return jsonify({"message": "Budget deleted"}), 200
