"""RecurringBill model.

A recurring bill is strictly per-user (see PRD §5.6 / §6). Ownership is carried
by ``user_id``; every query filters on the authenticated user, per CLAUDE.md's
user-isolation rule.

Money rule (CLAUDE.md): ``amount`` is an integer in minor units (cents), never
a float. It is stored as a POSITIVE magnitude — the bill describes an expense,
and the matching transaction that "pays" it is the negative of this value
(``transaction.amount == -bill.amount``). ``compute_status`` in the service
relies on that sign relationship.

``due_day`` is the day-of-month the bill recurs on (1..31). When a month is
shorter than ``due_day`` (e.g. 31 in February), the service clamps the concrete
cycle due date to the month's last day — see
``recurring_bill_service.current_cycle_due_date``.

Derived values rule (PRD §6, CLAUDE.md): the per-cycle status
(``paid`` / ``due_soon`` / ``upcoming``) is computed at read time by the
service and is deliberately NOT a column here.
"""

from datetime import datetime, timezone

from app.extensions import db


def _utcnow():
    """Timezone-aware current UTC time (stored naive-UTC in the DB column)."""
    return datetime.now(timezone.utc)


class RecurringBill(db.Model):
    __tablename__ = "recurring_bills"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    title = db.Column(db.String(255), nullable=False)
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=False,
        index=True,
    )
    # Integer minor units (cents), stored as a positive magnitude. The matching
    # "paid" transaction is the negative of this (an expense).
    amount = db.Column(db.Integer, nullable=False)
    # Day-of-month the bill recurs on, 1..31. Clamped to the month's real length
    # at read time by the service when computing a concrete cycle due date.
    due_day = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )

    def to_dict(self):
        """Serialize the recurring bill's stored columns for API responses.

        ``user_id`` is omitted (routes already scope by owner). The derived
        ``status`` is intentionally absent — it is computed at read time by the
        service and added there (see
        ``recurring_bill_service.recurring_bill_to_response_dict``).
        """
        return {
            "id": self.id,
            "title": self.title,
            "category_id": self.category_id,
            "amount": self.amount,
            "due_day": self.due_day,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return "<RecurringBill id={}>".format(self.id)
