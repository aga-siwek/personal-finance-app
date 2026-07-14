"""Transaction routes.

All routes require a valid JWT and act only on the authenticated user's own
transactions, per CLAUDE.md's user isolation rule. There is no update route —
transactions are immutable after creation (PRD §5.3).
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.schemas.transaction_schema import (
    TransactionCreateSchema,
    TransactionListQuerySchema,
)
from app.services import transaction_service
from app.services.transaction_service import (
    InvalidSortError,
    TransactionNotFoundError,
)
from app.utils.auth import get_current_user

transactions_bp = Blueprint("transactions", __name__, url_prefix="/transactions")

_create_schema = TransactionCreateSchema()
_list_query_schema = TransactionListQuerySchema()


def _current_user_or_401():
    user = get_current_user()
    if user is None:
        return None, (jsonify({"error": "Authentication required"}), 401)
    return user, None


@transactions_bp.get("")
@jwt_required()
def list_transactions():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        query = _list_query_schema.load(request.args.to_dict())
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    category_id = query["category_id"]
    if category_id is not None and category_id != "all":
        try:
            category_id = int(category_id)
        except ValueError:
            return jsonify({"error": "category_id must be an integer or 'all'"}), 400

    try:
        items, total = transaction_service.list_transactions(
            user,
            page=query["page"],
            per_page=query["per_page"],
            search=query["search"],
            sort=query["sort"],
            category_id=category_id,
        )
    except InvalidSortError:
        return jsonify({"error": "Invalid sort option"}), 400

    return (
        jsonify(
            {
                "transactions": [t.to_dict() for t in items],
                "page": query["page"],
                "per_page": query["per_page"],
                "total": total,
            }
        ),
        200,
    )


@transactions_bp.post("")
@jwt_required()
def create_transaction():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        transaction = transaction_service.create_transaction(
            user,
            category_id=data["category_id"],
            recipient_name=data["recipient_name"],
            amount=data["amount"],
            transaction_date=data["transaction_date"],
        )
    except TransactionNotFoundError:
        return jsonify({"error": "Category not found"}), 400

    return jsonify({"transaction": transaction.to_dict()}), 201


@transactions_bp.get("/<int:transaction_id>")
@jwt_required()
def get_transaction(transaction_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        transaction = transaction_service.get_transaction(user, transaction_id)
    except TransactionNotFoundError:
        return jsonify({"error": "Transaction not found"}), 404

    return jsonify({"transaction": transaction.to_dict()}), 200


@transactions_bp.delete("/<int:transaction_id>")
@jwt_required()
def delete_transaction(transaction_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        transaction_service.delete_transaction(user, transaction_id)
    except TransactionNotFoundError:
        return jsonify({"error": "Transaction not found"}), 404

    return jsonify({"message": "Transaction deleted"}), 200
