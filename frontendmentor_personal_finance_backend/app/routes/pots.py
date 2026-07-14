"""Pot routes.

All routes require a valid JWT and act only on the authenticated user's own
pots, per CLAUDE.md's user isolation rule. ``/add`` and ``/withdraw`` are
atomic, concurrency-safe operations — see ``pot_service``.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.schemas.pot_schema import PotAmountSchema, PotCreateSchema, PotUpdateSchema
from app.services import pot_service
from app.services.pot_service import (
    InsufficientBalanceError,
    InsufficientPotBalanceError,
    InvalidAmountError,
    PotNotFoundError,
)
from app.utils.auth import get_current_user

pots_bp = Blueprint("pots", __name__, url_prefix="/pots")

_create_schema = PotCreateSchema()
_update_schema = PotUpdateSchema()
_amount_schema = PotAmountSchema()


def _current_user_or_401():
    user = get_current_user()
    if user is None:
        return None, (jsonify({"error": "Authentication required"}), 401)
    return user, None


@pots_bp.get("")
@jwt_required()
def list_pots():
    user, error = _current_user_or_401()
    if error:
        return error

    pots = pot_service.list_pots(user)
    return jsonify({"pots": [p.to_dict() for p in pots]}), 200


@pots_bp.post("")
@jwt_required()
def create_pot():
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    pot = pot_service.create_pot(
        user,
        name=data["name"],
        target_amount=data["target_amount"],
        theme=data["theme"],
    )
    return jsonify({"pot": pot.to_dict()}), 201


@pots_bp.get("/<int:pot_id>")
@jwt_required()
def get_pot(pot_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        pot = pot_service.get_pot(user, pot_id)
    except PotNotFoundError:
        return jsonify({"error": "Pot not found"}), 404

    return jsonify({"pot": pot.to_dict()}), 200


@pots_bp.put("/<int:pot_id>")
@jwt_required()
def update_pot(pot_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _update_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        pot = pot_service.update_pot(
            user,
            pot_id,
            name=data.get("name"),
            target_amount=data.get("target_amount"),
            theme=data.get("theme"),
        )
    except PotNotFoundError:
        return jsonify({"error": "Pot not found"}), 404

    return jsonify({"pot": pot.to_dict()}), 200


@pots_bp.delete("/<int:pot_id>")
@jwt_required()
def delete_pot(pot_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        pot_service.delete_pot(user, pot_id)
    except PotNotFoundError:
        return jsonify({"error": "Pot not found"}), 404

    return jsonify({"message": "Pot deleted"}), 200


@pots_bp.post("/<int:pot_id>/add")
@jwt_required()
def add_to_pot(pot_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _amount_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        pot = pot_service.add_to_pot(user, pot_id, data["amount"])
    except PotNotFoundError:
        return jsonify({"error": "Pot not found"}), 404
    except (InsufficientBalanceError, InvalidAmountError) as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"pot": pot.to_dict()}), 200


@pots_bp.post("/<int:pot_id>/withdraw")
@jwt_required()
def withdraw_from_pot(pot_id):
    user, error = _current_user_or_401()
    if error:
        return error

    try:
        data = _amount_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 400

    try:
        pot = pot_service.withdraw_from_pot(user, pot_id, data["amount"])
    except PotNotFoundError:
        return jsonify({"error": "Pot not found"}), 404
    except (InsufficientPotBalanceError, InvalidAmountError) as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"pot": pot.to_dict()}), 200
