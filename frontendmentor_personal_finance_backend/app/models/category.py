"""Category model.

A category is strictly per-user (see PRD §5.2 / §6). Ownership is carried by
``user_id``; every query against this table filters on the authenticated user,
per CLAUDE.md's user-isolation rule. A ``(user_id, name)`` unique constraint
enforces that one user cannot hold two categories with the same name, while
still letting different users each have their own "Groceries".
"""

from datetime import datetime, timezone

from app.extensions import db


def _utcnow():
    """Timezone-aware current UTC time (stored naive-UTC in the DB column)."""
    return datetime.now(timezone.utc)


class Category(db.Model):
    __tablename__ = "categories"
    __table_args__ = (
        db.UniqueConstraint("user_id", "name", name="uq_categories_user_id_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    name = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )

    def to_dict(self):
        """Serialize the category for API responses.

        ``user_id`` is intentionally omitted: every route already scopes by
        owner, so exposing it would add nothing but noise.
        """
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return "<Category id={}>".format(self.id)
