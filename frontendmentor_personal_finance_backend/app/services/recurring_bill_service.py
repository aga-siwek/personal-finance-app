"""Recurring bill business logic.

All DB access for recurring bills lives here, not in the route handlers (per
CLAUDE.md). Bills are strictly per-user: every query filters on the owning
user's id.

This is the foundational pass. The genuinely tricky, easy-to-get-wrong parts
are implemented and documented here:
  - ``current_cycle_due_date`` — turning a day-of-month into a concrete date,
    clamped to the real length of the month (31 in February -> 28/29),
  - ``compute_status`` — the derived per-cycle ``paid``/``due_soon``/
    ``upcoming`` state (PRD §5.6), never stored,
  - the ``list_recurring_bills`` sort, matching the 6-value transaction sort
    concept adapted to a bill's cycle due date.

Sort interpretation (documented, since "latest/oldest" is ambiguous for a
recurring thing): all of a user's bills share the same monthly cycle, so their
relative chronological order within any cycle is fully determined by
``due_day`` — a bill due on the 5th always comes before one due on the 20th.
So:
  - ``latest``  -> due later in the cycle  -> ``due_day`` DESC
  - ``oldest``  -> due earlier in the cycle -> ``due_day`` ASC
  - ``name_asc`` / ``name_desc`` -> by ``title`` (case-insensitive)
  - ``amount_asc`` / ``amount_desc`` -> by stored (positive) ``amount``
This orders by day-of-month rather than recomputing each clamped concrete date
in SQL; clamping is monotonic in ``due_day`` so it never changes this ordering.

Status interpretation (documented, since PRD §5.6 and open question #1/#2 leave
it ambiguous):
  - ``paid``     -> a matching transaction exists in the current cycle window
                    (see ``compute_status``).
  - ``due_soon`` -> not paid, and the current cycle's due date is at most
                    ``RECURRING_BILL_DUE_SOON_DAYS`` days in the future OR is
                    already in the past (overdue-and-unpaid). The PRD only
                    defines three states, so an overdue unpaid bill stays
                    ``due_soon`` rather than inventing a 4th "overdue" state.
  - ``upcoming`` -> not paid, and the due date is more than the threshold days
                    away.
"""

import calendar
from datetime import date

from sqlalchemy import func

from app.extensions import db
from app.models.recurring_bill import RecurringBill
from app.models.transaction import Transaction
from app.services import category_service

# Re-exported so create() callers can catch category-ownership failures without
# reaching into ``category_service`` directly (same pattern as budget_service).
CategoryNotFoundError = category_service.CategoryNotFoundError

# PRD §5.6 open question #2: the "due soon" threshold. A bill whose current
# cycle due date is within this many days (or already past, still unpaid) reads
# as ``due_soon``. Module-level so it is not a magic number and the route/schema
# pass can reference the same value.
RECURRING_BILL_DUE_SOON_DAYS = 3

# Accepted ``sort`` values mapped to their ORDER BY clause. Kept as a module
# constant so the route/schema pass can reuse the exact same allow-list.
_SORT_OPTIONS = {
    "latest": lambda: RecurringBill.due_day.desc(),
    "oldest": lambda: RecurringBill.due_day.asc(),
    "name_asc": lambda: func.lower(RecurringBill.title).asc(),
    "name_desc": lambda: func.lower(RecurringBill.title).desc(),
    "amount_asc": lambda: RecurringBill.amount.asc(),
    "amount_desc": lambda: RecurringBill.amount.desc(),
}


class RecurringBillError(Exception):
    """Base class for recurring-bill failures the routes turn into HTTP errors."""


class RecurringBillNotFoundError(RecurringBillError):
    """Raised when a recurring bill does not exist for the requesting user."""


class InvalidSortError(RecurringBillError):
    """Raised when ``list_recurring_bills`` is given an unrecognized sort."""


class InvalidDueDayError(RecurringBillError):
    """Raised when ``due_day`` is outside 1..31. The service is the
    authoritative guard; a schema also validates this later."""


def _require_valid_due_day(due_day):
    if isinstance(due_day, bool) or not isinstance(due_day, int):
        raise InvalidDueDayError("due_day must be an integer between 1 and 31")
    if due_day < 1 or due_day > 31:
        raise InvalidDueDayError("due_day must be between 1 and 31")


def _clamped_due_date(due_day, year, month):
    """Concrete due date for ``due_day`` in ``(year, month)``, clamped to the
    month's real length (e.g. due_day=31 in February -> 28th/29th)."""
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(due_day, last_day))


def current_cycle_due_date(bill, today=None):
    """Return this cycle's concrete due date for ``bill``.

    "This cycle" is the occurrence in ``today``'s own month: a monthly bill's
    due date for the current month, clamped to that month's length. ``today``
    defaults to ``date.today()`` but is injectable for testing.
    """
    if today is None:
        today = date.today()
    return _clamped_due_date(bill.due_day, today.year, today.month)


def _previous_cycle_due_date(bill, today=None):
    """Return the previous cycle's concrete due date (the occurrence in the
    month before ``today``'s month), clamped to that month's length.

    Used by ``compute_status`` to bound the "this cycle" window from below.
    """
    if today is None:
        today = date.today()
    if today.month == 1:
        prev_year, prev_month = today.year - 1, 12
    else:
        prev_year, prev_month = today.year, today.month - 1
    return _clamped_due_date(bill.due_day, prev_year, prev_month)


def get_recurring_bill(user, bill_id):
    """Return the user's own recurring bill by id, or raise
    ``RecurringBillNotFoundError``. Scoped by ``user_id``."""
    bill = RecurringBill.query.filter_by(id=bill_id, user_id=user.id).first()
    if bill is None:
        raise RecurringBillNotFoundError("Recurring bill not found")
    return bill


def list_recurring_bills(user, search=None, sort="latest"):
    """List the user's recurring bills.

    ``search``: case-insensitive substring match on ``title`` (portable
    ``lower(...).contains(lower(...))``, same approach as transactions).
    ``sort``: one of ``_SORT_OPTIONS`` keys; an unknown value raises
    ``InvalidSortError``. Returns a list of ``RecurringBill`` rows (no
    pagination — a user's recurring bills are a small, bounded set).
    """
    if sort not in _SORT_OPTIONS:
        raise InvalidSortError("Unknown sort option: {}".format(sort))

    query = RecurringBill.query.filter_by(user_id=user.id)

    if search:
        needle = search.strip()
        if needle:
            query = query.filter(
                func.lower(RecurringBill.title).contains(func.lower(needle))
            )

    return query.order_by(_SORT_OPTIONS[sort]()).all()


def create_recurring_bill(user, title, category_id, amount, due_day):
    """Create a recurring bill for ``user`` and return it.

    Validates category ownership via ``category_service.get_category`` (a
    bad/foreign id raises ``CategoryNotFoundError``, re-raised as-is — same
    documented contract as ``budget_service.create_budget``) and validates
    ``1 <= due_day <= 31``.

    ``amount`` is stored as a positive integer magnitude in minor units
    (cents); the matching "paid" transaction is its negative.
    """
    category_service.get_category(user, category_id)
    _require_valid_due_day(due_day)

    bill = RecurringBill(
        user_id=user.id,
        title=title,
        category_id=category_id,
        amount=amount,
        due_day=due_day,
    )
    db.session.add(bill)
    db.session.commit()
    return bill


def update_recurring_bill(
    user, bill_id, title=None, category_id=None, amount=None, due_day=None
):
    """Update the user's own recurring bill.

    All of ``title``/``category_id``/``amount``/``due_day`` are mutable (a
    recurring bill has no immutable-identity constraint, unlike a budget).
    Passing ``None`` leaves a field unchanged. A new ``category_id`` is
    ownership-checked; a new ``due_day`` is range-checked.

    Raises ``RecurringBillNotFoundError`` if the bill isn't the user's.
    """
    bill = get_recurring_bill(user, bill_id)

    if title is not None:
        bill.title = title
    if category_id is not None:
        category_service.get_category(user, category_id)
        bill.category_id = category_id
    if amount is not None:
        bill.amount = amount
    if due_day is not None:
        _require_valid_due_day(due_day)
        bill.due_day = due_day

    db.session.commit()
    return bill


def delete_recurring_bill(user, bill_id):
    """Delete the user's own recurring bill. Raises
    ``RecurringBillNotFoundError`` if it isn't the user's."""
    bill = get_recurring_bill(user, bill_id)
    db.session.delete(bill)
    db.session.commit()


def compute_status(user, bill, today=None):
    """Return the derived status for ``bill`` this cycle.

    One of ``"paid"``, ``"due_soon"``, ``"upcoming"`` (never stored — PRD §6).
    ``today`` defaults to ``date.today()`` but is injectable for testing.

    Precedence:
      1. ``paid`` — a non-deleted transaction exists for this user with
         ``category_id == bill.category_id``, ``amount == -bill.amount`` (exact
         expense match: the transaction is the negative of the bill's positive
         stored amount), and ``transaction_date`` inside the current cycle
         window: strictly after the previous cycle's due date and on/before
         this cycle's due date, i.e. ``(prev_due, curr_due]``.
      2. ``due_soon`` — not paid, and ``curr_due - today <=
         RECURRING_BILL_DUE_SOON_DAYS`` days. Because that delta is negative
         once the due date has passed, this also covers overdue-and-unpaid
         bills (the PRD defines no separate "overdue" state).
      3. ``upcoming`` — not paid and more than the threshold days away.
    """
    if today is None:
        today = date.today()

    curr_due = current_cycle_due_date(bill, today=today)
    prev_due = _previous_cycle_due_date(bill, today=today)

    match = (
        Transaction.query.filter(
            Transaction.user_id == user.id,
            Transaction.category_id == bill.category_id,
            Transaction.deleted_at.is_(None),
            Transaction.amount == -bill.amount,
            Transaction.transaction_date > prev_due,
            Transaction.transaction_date <= curr_due,
        ).first()
    )
    if match is not None:
        return "paid"

    days_until_due = (curr_due - today).days
    if days_until_due <= RECURRING_BILL_DUE_SOON_DAYS:
        return "due_soon"

    return "upcoming"


def recurring_bill_to_response_dict(user, bill, today=None):
    """Build the enriched API response dict for a single recurring bill.

    Returns ``bill.to_dict()`` plus the derived ``status`` from
    ``compute_status``. ``today`` is injectable for testing (threaded through).
    The route/list pass calls this per bill to assemble responses.
    """
    data = bill.to_dict()
    data["status"] = compute_status(user, bill, today=today)
    return data
