"""Transaction model.

A transaction is strictly per-user (see PRD §5.3 / §6). Ownership is carried
by ``user_id``; every query against this table filters on the authenticated
user, per CLAUDE.md's user-isolation rule.

Transactions are immutable after creation (PRD §5.3): there is no update path
and therefore no ``updated_at`` — the only mutation a row ever undergoes is a
soft delete, recorded by stamping ``deleted_at``. Rows are never physically
removed, so financial history is preserved.

Money rule (CLAUDE.md): ``amount`` is a signed integer in minor units (cents),
never a float. Positive = income, negative = expense.

NOTE: a ``receipt_scan_id`` FK is deliberately NOT defined here. PRD §5.3 says
a transaction created from a confirmed receipt scan stores a reference back to
that scan, but the ``receipt_scans`` table does not exist yet. Adding a FK to a
nonexistent table now would be invalid; it is deferred to the Receipt Scanner
stage, which will add the column (and its migration) once that table exists.
"""

from datetime import datetime, timezone

from app.extensions import db


def _utcnow():
    """Timezone-aware current UTC time (stored naive-UTC in the DB column)."""
    return datetime.now(timezone.utc)


# Allowed values for ``Transaction.source``. Kept as a plain string column
# guarded by a CHECK constraint rather than a native DB enum: check constraints
# are portable across SQLite (dev) and Postgres (later) and far easier to alter
# than a native enum type. This is a deliberate choice — see PRD §5.3.
TRANSACTION_SOURCES = ("manual", "receipt_scan")


class Transaction(db.Model):
    __tablename__ = "transactions"
    __table_args__ = (
        db.CheckConstraint(
            "source IN ('manual', 'receipt_scan')",
            name="ck_transactions_source",
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
    # PRD §5.3 "recipient/sender name" — the other party of the transaction.
    recipient_name = db.Column(db.String(255), nullable=False)
    # Signed integer minor units (cents). Positive = income, negative = expense.
    amount = db.Column(db.Integer, nullable=False)
    # The date the transaction happened, distinct from ``created_at`` (when the
    # row was recorded).
    transaction_date = db.Column(db.Date, nullable=False)
    source = db.Column(db.String(20), nullable=False, default="manual")

    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    # Soft-delete marker. NULL = active; a timestamp = deleted. Rows are never
    # physically removed (PRD §5.3 immutability + preserved history).
    deleted_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        """Serialize the transaction for API responses.

        ``user_id`` is omitted (routes already scope by owner). ``deleted_at``
        is omitted too: soft-deleted rows are excluded at the query layer and
        never reach the client, so there is no field to expose.
        """
        return {
            "id": self.id,
            "category_id": self.category_id,
            "recipient_name": self.recipient_name,
            "amount": self.amount,
            "transaction_date": (
                self.transaction_date.isoformat()
                if self.transaction_date
                else None
            ),
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return "<Transaction id={}>".format(self.id)
