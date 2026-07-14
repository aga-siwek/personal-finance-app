"""Admin routes.

All routes here are cross-user (support/ops), gated by ``@require_admin``
(PRD §4). None of these are scoped to "the current user" — that's the whole
point of Admin — so there is no ``get_current_user()``/ownership check per
resource; the gate is entirely the decorator.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from app.schemas.admin_schema import (
    AdminListTransactionsQuerySchema,
    AdminListUsersQuerySchema,
    AdminResourceFilterQuerySchema,
    AdminUpdateUserSchema,
)
from app.services import admin_service
from app.services.admin_service import (
    EmailAlreadyRegisteredError,
    ResourceNotFoundError,
    UserNotFoundError,
)
from app.utils.decorators import require_admin

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

_update_user_schema = AdminUpdateUserSchema()
_list_users_query_schema = AdminListUsersQuerySchema()
_list_transactions_query_schema = AdminListTransactionsQuerySchema()
_resource_filter_query_schema = AdminResourceFilterQuerySchema()


def _load_query(schema):
    """Validate ``request.args`` against ``schema``. Returns
    ``(data, error_response)`` — ``error_response`` is ``None`` on success."""
    try:
        return schema.load(request.args.to_dict()), None
    except ValidationError as err:
        return None, (
            jsonify({"error": "Validation failed", "details": err.messages}),
            400,
        )


# --- Users --------------------------------------------------------------


@admin_bp.get("/users")
@require_admin
def list_users():
    query, error = _load_query(_list_users_query_schema)
    if error:
        return error

    users, total = admin_service.list_users(
        page=query["page"], per_page=query["per_page"]
    )
    return (
        jsonify(
            {
                "users": [u.to_dict() for u in users],
                "page": query["page"],
                "per_page": query["per_page"],
                "total": total,
            }
        ),
        200,
    )


@admin_bp.get("/users/<int:user_id>")
@require_admin
def get_user(user_id):
    try:
        user = admin_service.get_user(user_id)
    except UserNotFoundError:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


@admin_bp.put("/users/<int:user_id>")
@require_admin
def update_user(user_id):
    try:
        data = _update_user_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        user = admin_service.update_user(
            user_id,
            name=data.get("name"),
            email=data.get("email"),
            timezone=data.get("timezone"),
        )
    except UserNotFoundError:
        return jsonify({"error": "User not found"}), 404
    except EmailAlreadyRegisteredError:
        return jsonify({"error": "Email is already registered"}), 409

    return jsonify({"user": user.to_dict()}), 200


@admin_bp.delete("/users/<int:user_id>")
@require_admin
def delete_user(user_id):
    try:
        admin_service.delete_user(user_id)
    except UserNotFoundError:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"message": "User deleted"}), 200


@admin_bp.post("/users/<int:user_id>/promote")
@require_admin
def promote_user(user_id):
    try:
        user = admin_service.promote_user(user_id)
    except UserNotFoundError:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


@admin_bp.post("/users/<int:user_id>/demote")
@require_admin
def demote_user(user_id):
    current_user_id = get_jwt_identity()
    if str(user_id) == str(current_user_id):
        return jsonify({"error": "Cannot demote your own account"}), 400

    try:
        user = admin_service.demote_user(user_id)
    except UserNotFoundError:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


# --- Transactions ---------------------------------------------------------


@admin_bp.get("/transactions/all")
@require_admin
def list_all_transactions():
    query, error = _load_query(_list_transactions_query_schema)
    if error:
        return error

    transactions, total = admin_service.list_all_transactions(
        page=query["page"],
        per_page=query["per_page"],
        user_id=query["user_id"],
        category_id=query["category_id"],
    )
    return (
        jsonify(
            {
                "transactions": [t.to_dict() for t in transactions],
                "page": query["page"],
                "per_page": query["per_page"],
                "total": total,
            }
        ),
        200,
    )


@admin_bp.get("/transactions/<int:transaction_id>")
@require_admin
def get_transaction(transaction_id):
    try:
        transaction = admin_service.get_transaction(transaction_id)
    except ResourceNotFoundError:
        return jsonify({"error": "Transaction not found"}), 404
    return jsonify({"transaction": transaction.to_dict()}), 200


@admin_bp.delete("/transactions/<int:transaction_id>")
@require_admin
def delete_transaction(transaction_id):
    try:
        admin_service.delete_transaction(transaction_id)
    except ResourceNotFoundError:
        return jsonify({"error": "Transaction not found"}), 404
    return jsonify({"message": "Transaction deleted"}), 200


# --- Categories -----------------------------------------------------------


@admin_bp.get("/categories/all")
@require_admin
def list_all_categories():
    query, error = _load_query(_resource_filter_query_schema)
    if error:
        return error

    categories = admin_service.list_all_categories(user_id=query["user_id"])
    return jsonify({"categories": [c.to_dict() for c in categories]}), 200


@admin_bp.get("/categories/<int:category_id>")
@require_admin
def get_category(category_id):
    try:
        category = admin_service.get_category(category_id)
    except ResourceNotFoundError:
        return jsonify({"error": "Category not found"}), 404
    return jsonify({"category": category.to_dict()}), 200


# --- Budgets ----------------------------------------------------------------


@admin_bp.get("/budgets/all")
@require_admin
def list_all_budgets():
    query, error = _load_query(_resource_filter_query_schema)
    if error:
        return error

    budgets = admin_service.list_all_budgets(user_id=query["user_id"])
    return (
        jsonify(
            {"budgets": [admin_service.budget_to_admin_dict(b) for b in budgets]}
        ),
        200,
    )


@admin_bp.get("/budgets/<int:budget_id>")
@require_admin
def get_budget(budget_id):
    try:
        budget = admin_service.get_budget(budget_id)
    except ResourceNotFoundError:
        return jsonify({"error": "Budget not found"}), 404
    return jsonify({"budget": admin_service.budget_to_admin_dict(budget)}), 200


# --- Pots -----------------------------------------------------------------


@admin_bp.get("/pots/all")
@require_admin
def list_all_pots():
    query, error = _load_query(_resource_filter_query_schema)
    if error:
        return error

    pots = admin_service.list_all_pots(user_id=query["user_id"])
    return jsonify({"pots": [p.to_dict() for p in pots]}), 200


@admin_bp.get("/pots/<int:pot_id>")
@require_admin
def get_pot(pot_id):
    try:
        pot = admin_service.get_pot(pot_id)
    except ResourceNotFoundError:
        return jsonify({"error": "Pot not found"}), 404
    return jsonify({"pot": pot.to_dict()}), 200


# --- Recurring bills ------------------------------------------------------


@admin_bp.get("/recurring-bills/all")
@require_admin
def list_all_recurring_bills():
    query, error = _load_query(_resource_filter_query_schema)
    if error:
        return error

    bills = admin_service.list_all_recurring_bills(user_id=query["user_id"])
    return (
        jsonify(
            {
                "recurring_bills": [
                    admin_service.recurring_bill_to_admin_dict(b) for b in bills
                ]
            }
        ),
        200,
    )


@admin_bp.get("/recurring-bills/<int:bill_id>")
@require_admin
def get_recurring_bill(bill_id):
    try:
        bill = admin_service.get_recurring_bill(bill_id)
    except ResourceNotFoundError:
        return jsonify({"error": "Recurring bill not found"}), 404
    return (
        jsonify({"recurring_bill": admin_service.recurring_bill_to_admin_dict(bill)}),
        200,
    )


# --- Reports ----------------------------------------------------------------


@admin_bp.get("/reports")
@require_admin
def reports_summary():
    return jsonify(admin_service.reports_summary()), 200


@admin_bp.get("/reports/transactions")
@require_admin
def reports_transactions():
    return jsonify(admin_service.reports_transactions()), 200


@admin_bp.get("/reports/users")
@require_admin
def reports_users():
    return jsonify(admin_service.reports_users()), 200
