"""Route authorization decorators."""

from functools import wraps

from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request

from app.utils.auth import get_current_user


def require_admin(fn):
    """Require a valid JWT belonging to an admin user.

    Usable as a single decorator on a route: it verifies the JWT itself
    (so it does not need to be stacked with ``@jwt_required()``), then checks
    ``is_admin``. Responds 401 if the token is missing/invalid and 403 if the
    authenticated user is not an admin.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Raises/aborts with 401 via the JWT error handlers if invalid.
        verify_jwt_in_request()
        user = get_current_user()
        if user is None:
            return jsonify({"error": "Authentication required"}), 401
        if not user.is_admin:
            return jsonify({"error": "Admin privileges required"}), 403
        return fn(*args, **kwargs)

    return wrapper
