"""User model."""

from datetime import datetime, timezone

from app.extensions import db


def _utcnow():
    """Timezone-aware current UTC time (stored naive-UTC in the DB column)."""
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    timezone = db.Column(db.String(64), nullable=False, default="UTC")
    is_admin = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow
    )
    updated_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )

    def to_dict(self):
        """Serialize the user for API responses.

        Never includes ``password_hash`` — the field is intentionally omitted
        so a hash can never leak through any endpoint that returns a user.
        """
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "timezone": self.timezone,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        # Never include email/hash in repr — repr can end up in logs.
        return "<User id={}>".format(self.id)
