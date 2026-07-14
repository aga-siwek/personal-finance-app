"""Overview route — single aggregated dashboard endpoint (PRD §5.8)."""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.services import overview_service
from app.utils.auth import get_current_user

overview_bp = Blueprint("overview", __name__, url_prefix="/overview")


@overview_bp.get("")
@jwt_required()
def get_overview():
    user = get_current_user()
    if user is None:
        return jsonify({"error": "Authentication required"}), 401

    return jsonify(overview_service.get_overview(user)), 200
