"""Application factory.

``create_app`` wires configuration, extensions, blueprints and the JWT
blocklist loader. Extensions are defined uninitialized in ``app.extensions``
and bound to the app here to avoid circular imports.
"""

from flask import Flask

from app.extensions import bcrypt, cors, db, jwt, migrate
from config import get_config


def create_app(config_name=None, config_overrides=None):
    """Build and configure the Flask app.

    ``config_overrides`` lets callers (namely tests) set config keys — e.g.
    ``SQLALCHEMY_DATABASE_URI`` — *before* extensions are initialized, since
    ``db.init_app`` reads the URI immediately and can't be repointed after
    the fact.
    """
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))
    if config_overrides:
        app.config.update(config_overrides)

    _init_extensions(app)
    _register_jwt_handlers(app)
    _register_blueprints(app)

    return app


def _init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    origins = app.config.get("CORS_ORIGINS", "*")
    if isinstance(origins, str) and origins != "*":
        origins = [o.strip() for o in origins.split(",") if o.strip()]
    cors.init_app(app, resources={r"/*": {"origins": origins}})

    # Ensure models are imported so their tables register on db.metadata
    # (needed for Alembic autogenerate and the blocklist query below).
    from app import models  # noqa: F401


def _register_jwt_handlers(app):
    from app.models.token_blocklist import TokenBlocklist

    @jwt.token_in_blocklist_loader
    def token_in_blocklist(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        token = TokenBlocklist.query.filter_by(jti=jti).first()
        return token is not None


def _register_blueprints(app):
    from app.routes.admin import admin_bp
    from app.routes.auth import auth_bp
    from app.routes.budgets import budgets_bp
    from app.routes.categories import categories_bp
    from app.routes.overview import overview_bp
    from app.routes.pots import pots_bp
    from app.routes.recurring_bills import recurring_bills_bp
    from app.routes.transactions import transactions_bp
    from app.routes.users import users_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(pots_bp)
    app.register_blueprint(recurring_bills_bp)
    app.register_blueprint(overview_bp)
    app.register_blueprint(admin_bp)
