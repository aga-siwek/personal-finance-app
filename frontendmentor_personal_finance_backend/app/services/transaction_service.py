"""Transaction business logic.

All DB access for transactions lives here, not in the route handlers (per
CLAUDE.md: "Database queries go in models or services, never in route
handlers"). Transactions are strictly per-user: every query filters on the
owning user's id, per the project-wide user-isolation rule — a user must never
be able to reach another user's transaction by id.

Transactions are immutable after creation (PRD §5.3): this module offers
create, read, list and soft-delete — there is deliberately no update path.

This is the foundational pass. The full, correct core (create + the
carefully-built ``list_transactions`` query, plus soft-delete semantics) is
implemented here; the follow-up pass only wires the route/schema JSON shape
around it.
"""

from datetime import datetime, timezone

from sqlalchemy import func

from app.extensions import db
from app.models.transaction import Transaction
from app.services import category_service


def _utcnow():
    """Timezone-aware current UTC time, matching the model's storage."""
    return datetime.now(timezone.utc)

# Accepted ``sort`` values for ``list_transactions`` mapped to their ORDER BY
# clause. Kept as a module constant so the route/schema pass can reuse the exact
# same allow-list when validating query params.
_SORT_OPTIONS = {
    "latest": lambda: Transaction.transaction_date.desc(),
    "oldest": lambda: Transaction.transaction_date.asc(),
    "name_asc": lambda: func.lower(Transaction.recipient_name).asc(),
    "name_desc": lambda: func.lower(Transaction.recipient_name).desc(),
    "amount_asc": lambda: Transaction.amount.asc(),
    "amount_desc": lambda: Transaction.amount.desc(),
}


class TransactionError(Exception):
    """Base class for transaction failures the routes turn into HTTP errors."""


class TransactionNotFoundError(TransactionError):
    """Raised when a transaction does not exist for the requesting user (or has
    already been soft-deleted — from the API's perspective those look the
    same)."""


class InvalidSortError(TransactionError):
    """Raised when ``list_transactions`` is given an unrecognized sort value."""


def create_transaction(
    user, category_id, recipient_name, amount, transaction_date, source="manual"
):
    """Create a transaction for ``user`` and return it.

    Validates that ``category_id`` names a category the user actually owns by
    delegating to ``category_service.get_category`` (which raises
    ``CategoryNotFoundError`` — and is already user-scoped). That error is
    translated into ``TransactionNotFoundError`` so callers of this module deal
    with a single, transaction-flavored exception family; the route may still
    catch ``CategoryNotFoundError`` directly if it wants a category-specific
    message, but the contract here is: a bad/foreign category id surfaces as
    ``TransactionNotFoundError``.

    ``amount`` is a signed integer in minor units (cents); ``source`` must be
    one of ``TRANSACTION_SOURCES`` (enforced at the DB level by a CHECK
    constraint, and validated by the schema pass on input).
    """
    try:
        category_service.get_category(user, category_id)
    except category_service.CategoryNotFoundError as exc:
        raise TransactionNotFoundError("Category not found") from exc

    transaction = Transaction(
        user_id=user.id,
        category_id=category_id,
        recipient_name=recipient_name,
        amount=amount,
        transaction_date=transaction_date,
        source=source,
    )
    db.session.add(transaction)
    db.session.commit()
    return transaction


def get_transaction(user, transaction_id):
    """Return the user's own, non-deleted transaction by id.

    Scoped by ``user_id`` so a user can never load another user's transaction,
    and excludes soft-deleted rows. Raises ``TransactionNotFoundError`` if the
    transaction isn't the user's, doesn't exist, or is already soft-deleted.
    """
    transaction = (
        Transaction.query.filter_by(id=transaction_id, user_id=user.id)
        .filter(Transaction.deleted_at.is_(None))
        .first()
    )
    if transaction is None:
        raise TransactionNotFoundError("Transaction not found")
    return transaction


def delete_transaction(user, transaction_id):
    """Soft-delete the user's own transaction.

    Stamps ``deleted_at`` instead of removing the row, so financial history is
    preserved (PRD §5.3). Deleting an already-deleted (or nonexistent, or
    foreign) transaction raises ``TransactionNotFoundError`` — from the API's
    perspective an already-deleted transaction is indistinguishable from one
    that never existed. Reuses ``get_transaction`` so the user-scoping and
    not-already-deleted checks are applied in exactly one place.
    """
    transaction = get_transaction(user, transaction_id)
    transaction.deleted_at = _utcnow()
    db.session.commit()
    return transaction


def list_transactions(
    user, page=1, per_page=20, search=None, sort="latest", category_id=None
):
    """List the user's non-deleted transactions, paginated.

    Every result is scoped to ``user.id`` and excludes soft-deleted rows.

    Parameters:
      - ``search``: case-insensitive substring match on ``recipient_name``.
        Uses ``func.lower(...).contains(func.lower(...))`` rather than
        ``.ilike()`` — ``.contains`` compiles to a portable ``LIKE`` and the
        explicit ``lower()`` on both sides gives us case-insensitivity that
        behaves the same on SQLite (dev) and Postgres (later); SQLite's LIKE is
        only ASCII-case-insensitive by default, so we don't rely on it.
      - ``category_id``: when provided and not the sentinel ``"all"``, filters
        to that category. ``None`` or ``"all"`` means "every category".
      - ``sort``: one of ``_SORT_OPTIONS`` keys (``latest``, ``oldest``,
        ``name_asc``, ``name_desc``, ``amount_asc``, ``amount_desc``). An
        unrecognized value raises ``InvalidSortError``.

    Return shape: a ``(items, total_count)`` tuple — ``items`` is the list of
    ``Transaction`` rows for the requested page (in sort order), ``total_count``
    is the total number of matching rows across all pages (after search/category
    filtering, before pagination). The route pass builds the paginated JSON
    envelope (page/per_page/total/pages) from these two values.
    """
    if sort not in _SORT_OPTIONS:
        raise InvalidSortError("Unknown sort option: {}".format(sort))

    query = Transaction.query.filter_by(user_id=user.id).filter(
        Transaction.deleted_at.is_(None)
    )

    if search:
        needle = search.strip()
        if needle:
            query = query.filter(
                func.lower(Transaction.recipient_name).contains(func.lower(needle))
            )

    if category_id is not None and category_id != "all":
        query = query.filter(Transaction.category_id == category_id)

    total_count = query.count()

    items = (
        query.order_by(_SORT_OPTIONS[sort]())
        .limit(per_page)
        .offset((page - 1) * per_page)
        .all()
    )
    return items, total_count
