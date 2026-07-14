"""Budget model.

A budget is strictly per-user (see PRD §5.4 / §6). Ownership is carried by
``user_id``; every query against this table filters on the authenticated user,
per CLAUDE.md's user-isolation rule.

One budget per (user, category): the ``(user_id, category_id)`` unique
constraint enforces PRD §5.4's "creating a second budget for a category that
already has one is rejected" — budgets are not additive.

Money rule (CLAUDE.md): ``max_spend`` is an integer in minor units (cents),
never a float.

Derived values rule (PRD §6, CLAUDE.md): ``spent`` and ``remaining`` are
computed at read time from the user's transactions in the category for the
current period — they are deliberately NOT columns here and never appear on
``to_dict()``. The service layer builds the enriched API response dict
(see ``budget_service.budget_to_response_dict``); this model only serializes
its own stored columns.

``theme`` is an opaque string the API persists and returns verbatim (PRD §5.4);
the backend never parses or interprets it.
"""

from datetime import datetime, timezone

from app.extensions import db


def _utcnow():
    """Timezone-aware current UTC time (stored naive-UTC in the DB column)."""
    return datetime.now(timezone.utc)


class Budget(db.Model):
    __tablename__ = "budgets"
    __table_args__ = (
        db.UniqueConstraint(
            "user_id", "category_id", name="uq_budgets_user_id_category_id"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=False,
        index=True,
    )
    # Integer minor units (cents). The budget's spending cap for the period.
    max_spend = db.Column(db.Integer, nullable=False)
    # Opaque theme identifier, stored and returned as-is (PRD §5.4).
    theme = db.Column(db.String(50), nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )

    def to_dict(self):
        """Serialize the budget's stored columns for API responses.

        ``user_id`` is omitted (routes already scope by owner). ``spent`` and
        ``remaining`` are intentionally absent — they are derived at read time
        by the service layer, never stored, and so are added there, not here.
        """
        return {
            "id": self.id,
            "category_id": self.category_id,
            "max_spend": self.max_spend,
            "theme": self.theme,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return "<Budget id={}>".format(self.id)
