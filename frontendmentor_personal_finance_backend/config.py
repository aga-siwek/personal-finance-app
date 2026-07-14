"""Application configuration.

Configuration is environment-driven. `create_app` selects a config class by
name (``development``, ``testing``, ``production``); each class reads its
values from environment variables so that no secret is ever hard-coded here.
"""

import os
from datetime import timedelta


def _get_int(name, default):
    """Read an integer env var, falling back to ``default`` if unset/blank."""
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


class Config:
    """Base configuration shared by every environment."""

    # Core Flask / crypto secrets. Real values come from the environment;
    # the defaults exist only so the app can boot in a throwaway dev shell.
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-me-too")

    # Database. `create_app`/tests may override SQLALCHEMY_DATABASE_URI, so we
    # read DATABASE_URL here but never force a value that blocks that override.
    # Per-environment defaults are set on the subclasses below.
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT lifetimes (seconds). Access tokens are short-lived; refresh tokens
    # long-lived. Flask-JWT-Extended accepts timedelta values.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=_get_int("JWT_ACCESS_TOKEN_EXPIRES", 900)
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=_get_int("JWT_REFRESH_TOKEN_EXPIRES", 2592000)
    )

    # File uploads (used by later components; defined here so config is central).
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "./uploads")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB, per CLAUDE.md upload rule

    # CORS. Comma-separated origins in the env var; "*" allows all.
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")


class DevelopmentConfig(Config):
    DEBUG = True
    # Local development defaults to a SQLite file so the app runs with zero
    # infrastructure. Switching to Postgres later is config-only: set
    # DATABASE_URL to a postgresql:// URL — no code/model/migration change.
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///dev.db")


class TestingConfig(Config):
    TESTING = True
    # No SQLALCHEMY_DATABASE_URI is set here on purpose: the test suite's
    # conftest.py overrides SQLALCHEMY_DATABASE_URI directly (SQLite).


class ProductionConfig(Config):
    DEBUG = False
    # Production requires an explicit DATABASE_URL (a Postgres URL). No default
    # fallback: fail loudly rather than silently run on a throwaway SQLite file.
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(config_name=None):
    """Resolve a config class by name, defaulting via ``FLASK_CONFIG`` env."""
    if config_name is None:
        config_name = os.environ.get("FLASK_CONFIG", "development")
    return config_by_name.get(config_name, DevelopmentConfig)
