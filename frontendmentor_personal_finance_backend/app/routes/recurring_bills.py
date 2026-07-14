"""Recurring bill routes.

All routes require a valid JWT and act only on the authenticated user's own
recurring bills, per CLAUDE.md's user isolation rule. Status (paid/upcoming/
due_soon) is derived at read time — see ``recurring_bill_service``.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.schemas.recurring_bill_schema import (
    RecurringBillCreateSchema,
    RecurringBillListQuerySchema,
    RecurringBillUpdateSchema,
)
from app.services import recurring_bill_service
from app.services.recurring_bill_service import (
    CategoryNotFoundError,
    InvalidDueDayError,
    InvalidSortError,
    RecurringBillNotFoundError,
)
from app.utils.auth import get_current_user

recurring_bills_bp = Blueprint(
    "recurring_bills", __name__, url_prefix="/recurring-bills"
)

_create_schema = RecurringBillCreateSchema()
_update_schema = RecurringBillUpdateSchema()
_list_query_schema = RecurringBillListQuerySchema()


def _current_user_or_401():
    user = get_current_user()
    if user is None:
        return None, (jsonify({"error": "Authentication required"}), 401)
    return user, None


@recurring_bills_bp.get("")
@jwt_required()
def list_recurring_bills():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        query = _list_query_schema.load(request.args.to_dict())
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        bills = recurring_bill_service.list_recurring_bills(
            user, search=query["search"], sort=query["sort"]
        )
    except InvalidSortError:
        return jsonify({"error": "Invalid sort option"}), 400

    return (
        jsonify(
            {
                "recurring_bills": [
                    recurring_bill_service.recurring_bill_to_response_dict(user, b)
                    for b in bills
                ]
            }
        ),
        200,
    )


@recurring_bills_bp.post("")
@jwt_required()
def create_recurring_bill():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        bill = recurring_bill_service.create_recurring_bill(
            user,
            title=data["title"],
            category_id=data["category_id"],
            amount=data["amount"],
            due_day=data["due_day"],
        )
    except CategoryNotFoundError:
        return jsonify({"error": "Category not found"}), 400
    except InvalidDueDayError as exc:
        return jsonify({"error": str(exc)}), 400

    return (
        jsonify(
            {
                "recurring_bill": recurring_bill_service.recurring_bill_to_response_dict(
                    user, bill
                )
            }
        ),
        201,
    )


@recurring_bills_bp.get("/<int:bill_id>")
@jwt_required()
def get_recurring_bill(bill_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        bill = recurring_bill_service.get_recurring_bill(user, bill_id)
    except RecurringBillNotFoundError:
        return jsonify({"error": "Recurring bill not found"}), 404

    return (
        jsonify(
            {
                "recurring_bill": recurring_bill_service.recurring_bill_to_response_dict(
                    user, bill
                )
            }
        ),
        200,
    )


@recurring_bills_bp.put("/<int:bill_id>")
@jwt_required()
def update_recurring_bill(bill_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _update_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        bill = recurring_bill_service.update_recurring_bill(
            user,
            bill_id,
            title=data.get("title"),
            category_id=data.get("category_id"),
            amount=data.get("amount"),
            due_day=data.get("due_day"),
        )
    except RecurringBillNotFoundError:
        return jsonify({"error": "Recurring bill not found"}), 404
    except CategoryNotFoundError:
        return jsonify({"error": "Category not found"}), 400
    except InvalidDueDayError as exc:
        return jsonify({"error": str(exc)}), 400

    return (
        jsonify(
            {
                "recurring_bill": recurring_bill_service.recurring_bill_to_response_dict(
                    user, bill
                )
            }
        ),
        200,
    )


@recurring_bills_bp.delete("/<int:bill_id>")
@jwt_required()
def delete_recurring_bill(bill_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        recurring_bill_service.delete_recurring_bill(user, bill_id)
    except RecurringBillNotFoundError:
        return jsonify({"error": "Recurring bill not found"}), 404

    return jsonify({"message": "Recurring bill deleted"}), 200
