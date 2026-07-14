"""Budget business logic.

All DB access for budgets lives here, not in the route handlers (per CLAUDE.md:
"Database queries go in models or services, never in route handlers"). Budgets
are strictly per-user: every query filters on the owning user's id, per the
project-wide user-isolation rule.

This is the foundational pass. The parts most likely to be gotten wrong later
are implemented and documented here:
  - the one-budget-per-category guard (behind the DB unique constraint),
  - ``compute_spent`` — the current-month derived spend that must never become
    a stored column (PRD §6),
  - ``budget_to_response_dict`` — where ``spent``/``remaining`` get attached to
    the API shape.

Category-ownership errors on create surface as ``CategoryNotFoundError``
(re-raised directly, NOT wrapped in a budget-flavored exception): a bad
``category_id`` genuinely means "that category doesn't exist for you", which is
a distinct failure from "that budget doesn't exist". Keeping them distinct lets
the route pass return a category-specific message. This is the deliberate,
documented contract for this module.
"""

from datetime import datetime, timezone

from sqlalchemy import func

from app.extensions import db
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.services import category_service

# Re-exported so callers can catch category-ownership failures from create
# without reaching into ``category_service`` themselves.
CategoryNotFoundError = category_service.CategoryNotFoundError


class BudgetError(Exception):
    """Base class for budget failures the routes turn into HTTP errors."""


class BudgetAlreadyExistsError(BudgetError):
    """Raised when the user already has a budget for the given category
    (PRD §5.4: one budget per category, not additive)."""


class BudgetNotFoundError(BudgetError):
    """Raised when a budget does not exist for the requesting user."""


def _first_of_current_month_utc(now=None):
    """Return midnight UTC on the 1st of the current month.

    ``now`` defaults to the current UTC time but is injectable for testing.
    Returned as a naive-UTC ``datetime`` to compare directly against the
    naive-UTC values stored in the DB.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1)


def get_budget(user, budget_id):
    """Return the user's own budget by id, or raise ``BudgetNotFoundError``.

    Scoped by ``user_id`` so a user can never load another user's budget.
    """
    budget = Budget.query.filter_by(id=budget_id, user_id=user.id).first()
    if budget is None:
        raise BudgetNotFoundError("Budget not found")
    return budget


def list_budgets(user):
    """Return all of the user's budgets, newest first."""
    return (
        Budget.query.filter_by(user_id=user.id)
        .order_by(Budget.created_at.desc())
        .all()
    )


def create_budget(user, category_id, max_spend, theme):
    """Create a budget for ``user`` and return it.

    Validates that ``category_id`` names a category the user owns by delegating
    to ``category_service.get_category``; a bad/foreign id raises
    ``CategoryNotFoundError`` (re-raised as-is — see module docstring).

    Raises ``BudgetAlreadyExistsError`` if the user already has a budget for
    that category (PRD §5.4). This service-layer check is the authoritative
    guard behind the ``(user_id, category_id)`` DB unique constraint.

    ``max_spend`` is an integer in minor units (cents); ``theme`` is stored
    verbatim.
    """
    category_service.get_category(user, category_id)

    existing = Budget.query.filter_by(
        user_id=user.id, category_id=category_id
    ).first()
    if existing is not None:
        raise BudgetAlreadyExistsError(
            "A budget already exists for this category"
        )

    budget = Budget(
        user_id=user.id,
        category_id=category_id,
        max_spend=max_spend,
        theme=theme,
    )
    db.session.add(budget)
    db.session.commit()
    return budget


def update_budget(user, budget_id, max_spend=None, theme=None):
    """Update the mutable fields of the user's own budget.

    Only ``max_spend`` and ``theme`` are mutable. ``category_id`` is NOT
    updatable: it defines the budget's identity under the unique constraint, so
    "changing the category" means deleting this budget and creating a new one,
    not mutating this row. Passing ``None`` for a field leaves it unchanged.

    Raises ``BudgetNotFoundError`` if the budget isn't the user's.
    """
    budget = get_budget(user, budget_id)

    if max_spend is not None:
        budget.max_spend = max_spend
    if theme is not None:
        budget.theme = theme

    db.session.commit()
    return budget


def delete_budget(user, budget_id):
    """Delete the user's own budget.

    Raises ``BudgetNotFoundError`` if the budget isn't the user's. Deleting a
    budget removes only the spending cap — it never touches transactions.
    """
    budget = get_budget(user, budget_id)
    db.session.delete(budget)
    db.session.commit()


def compute_spent(user, category_id, now=None):
    """Return how much the user has spent in ``category_id`` this month.

    "Spent" = the sum of ``abs(amount)`` over the user's non-deleted,
    expense (negative-amount) transactions in that category whose
    ``transaction_date`` falls in the current calendar month (from the 1st of
    the month, UTC, onward). Returns an integer in minor units (cents); 0 when
    there is no matching spend.

    Bounding: we filter ``transaction_date >= first_of_month``. No explicit
    upper bound is applied — transactions in this system are never dated in the
    future, so "this month so far" and "this whole month" coincide; keeping the
    lower bound only makes the query simpler and future-dated data (if it ever
    appeared) would harmlessly count toward the current month. ``now`` is
    injectable for testing.

    Derived at read time, never stored (PRD §6). Income (positive amounts) is
    excluded — a budget caps spending only.
    """
    first_of_month = _first_of_current_month_utc(now)

    total = (
        db.session.query(func.coalesce(func.sum(-Transaction.amount), 0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.category_id == category_id,
            Transaction.deleted_at.is_(None),
            Transaction.amount < 0,
            Transaction.transaction_date >= first_of_month.date(),
        )
        .scalar()
    )
    return int(total or 0)


def budget_to_response_dict(user, budget, now=None):
    """Build the enriched API response dict for a single budget.

    Returns ``budget.to_dict()`` plus two derived fields:
      - ``spent``: ``compute_spent(user, budget.category_id)`` (integer cents),
      - ``remaining``: ``max_spend - spent`` (integer cents).

    ``remaining`` is intentionally NOT clamped at zero: a negative value means
    the user is over budget, which is meaningful information the frontend
    renders. ``now`` is injectable for testing (threaded through to
    ``compute_spent``).
    """
    data = budget.to_dict()
    spent = compute_spent(user, budget.category_id, now=now)
    data["spent"] = spent
    data["remaining"] = budget.max_spend - spent
    return data
