"""Pot model.

A pot is a savings envelope, strictly per-user (see PRD §5.5 / §6). Ownership
is carried by ``user_id``; every query filters on the authenticated user, per
CLAUDE.md's user-isolation rule.

Money rule (CLAUDE.md): ``target_amount`` and ``total_saved`` are integers in
minor units (cents), never floats.

Concurrency note (PRD §5.5 / §7): ``total_saved`` is the one mutable money
field in this whole component. It is only ever moved by
``pot_service.add_to_pot`` / ``withdraw_from_pot``, which serialize concurrent
requests by locking the owning ``User`` row first (the main balance spans all
of a user's pots, so per-pot locking alone would not be safe). The main balance
itself is never stored — it is derived as
``sum(transactions.amount) - sum(pots.total_saved)`` at read time.
"""

from datetime import datetime, timezone

from app.extensions import db


def _utcnow():
    """Timezone-aware current UTC time (stored naive-UTC in the DB column)."""
    return datetime.now(timezone.utc)


class Pot(db.Model):
    __tablename__ = "pots"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    name = db.Column(db.String(255), nullable=False)
    # Integer minor units (cents). The savings goal for this pot.
    target_amount = db.Column(db.Integer, nullable=False)
    # Integer minor units (cents). How much has been moved into the pot so far.
    # Defaults to 0 on creation and is only ever changed by the atomic
    # add/withdraw service operations.
    total_saved = db.Column(db.Integer, nullable=False, default=0)
    # Opaque theme identifier, stored and returned as-is (PRD §5.5).
    theme = db.Column(db.String(50), nullable=False)

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )

    def to_dict(self):
        """Serialize the pot for API responses.

        ``user_id`` is omitted (routes already scope by owner).
        """
        return {
            "id": self.id,
            "name": self.name,
            "target_amount": self.target_amount,
            "total_saved": self.total_saved,
            "theme": self.theme,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return "<Pot id={}>".format(self.id)
