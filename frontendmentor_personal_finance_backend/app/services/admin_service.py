"""Admin business logic.

Cross-user, read-mostly access for support/ops (PRD §4: "Admin — read access
across all users' data plus user management ... Not a money-management
persona"). All routes calling into this module are behind ``@require_admin``.

No new models: this reuses ``User``/``Category``/``Transaction``/``Budget``/
``Pot``/``RecurringBill``, but deliberately does NOT reuse the per-user
services' functions for cross-user reads (those are strictly ``user_id``-
scoped by design — that's a security invariant, not something to bypass with
a fake user). Where a per-user service exposes a pure computation (derived
budget spent/remaining, recurring bill status, pot balance), those ARE reused
here since they take a `user` argument explicitly and do the right thing for
any user, admin-invoked or not.

Admin visibility intentionally does not filter out soft-deleted transactions
on list/get (support/audit use case — an admin looking into a user's history
needs to see deletions, unlike a regular user browsing their own current
data). Admin delete still only ever soft-deletes a transaction, never a hard
delete — immutability is a system-wide rule, not just a user-facing one.
"""

from datetime import datetime, timezone

from sqlalchemy import func

from app.extensions import db
from app.models.budget import Budget
from app.models.category import Category
from app.models.pot import Pot
from app.models.recurring_bill import RecurringBill
from app.models.transaction import Transaction
from app.models.user import User
from app.services import budget_service, recurring_bill_service


class AdminError(Exception):
    """Base class for admin failures the routes turn into HTTP errors."""


class UserNotFoundError(AdminError):
    """Raised when a target user does not exist."""


class EmailAlreadyRegisteredError(AdminError):
    """Raised when an admin update would collide with another user's email."""


class ResourceNotFoundError(AdminError):
    """Raised when a target Transaction/Category/Budget/Pot/RecurringBill does
    not exist (admin reads are cross-user, so this is a flat 404 — there's no
    ownership check to fail on)."""


# --- Users ------------------------------------------------------------------


def list_users(page=1, per_page=20):
    """Return ``(users, total_count)`` for all users, newest first."""
    query = User.query.order_by(User.created_at.desc())
    total = query.count()
    items = query.limit(per_page).offset((page - 1) * per_page).all()
    return items, total


def get_user(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        raise UserNotFoundError("User not found")
    return user


def update_user(user_id, name=None, email=None, timezone=None):
    """Admin update of another user's profile fields. Password is
    deliberately not editable here — that's the user's own
    ``PUT /users/me/password`` flow, never an admin action."""
    user = get_user(user_id)

    if name is not None:
        user.name = name.strip()
    if email is not None:
        normalized_email = email.strip().lower()
        if normalized_email != user.email:
            existing = User.query.filter(
                User.email == normalized_email, User.id != user.id
            ).first()
            if existing is not None:
                raise EmailAlreadyRegisteredError("Email is already registered")
            user.email = normalized_email
    if timezone is not None:
        user.timezone = timezone

    db.session.commit()
    return user


def delete_user(user_id):
    user = get_user(user_id)
    db.session.delete(user)
    db.session.commit()


def promote_user(user_id):
    user = get_user(user_id)
    user.is_admin = True
    db.session.commit()
    return user


def demote_user(user_id):
    user = get_user(user_id)
    user.is_admin = False
    db.session.commit()
    return user


# --- Transactions -------------------------------------------------------


def list_all_transactions(page=1, per_page=20, user_id=None, category_id=None):
    query = Transaction.query
    if user_id is not None:
        query = query.filter(Transaction.user_id == user_id)
    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)
    query = query.order_by(Transaction.transaction_date.desc())

    total = query.count()
    items = query.limit(per_page).offset((page - 1) * per_page).all()
    return items, total


def get_transaction(transaction_id):
    transaction = db.session.get(Transaction, transaction_id)
    if transaction is None:
        raise ResourceNotFoundError("Transaction not found")
    return transaction


def delete_transaction(transaction_id):
    """Soft-delete only — transactions are immutable/never hard-deleted,
    system-wide, not just for regular users."""
    transaction = get_transaction(transaction_id)
    transaction.deleted_at = datetime.now(timezone.utc)
    db.session.commit()


# --- Categories -----------------------------------------------------------


def list_all_categories(user_id=None):
    query = Category.query
    if user_id is not None:
        query = query.filter(Category.user_id == user_id)
    return query.order_by(Category.user_id, Category.name).all()


def get_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        raise ResourceNotFoundError("Category not found")
    return category


# --- Budgets ----------------------------------------------------------------


def list_all_budgets(user_id=None):
    query = Budget.query
    if user_id is not None:
        query = query.filter(Budget.user_id == user_id)
    return query.order_by(Budget.created_at.desc()).all()


def get_budget(budget_id):
    budget = db.session.get(Budget, budget_id)
    if budget is None:
        raise ResourceNotFoundError("Budget not found")
    return budget


def budget_to_admin_dict(budget):
    """Enriched budget dict with spent/remaining, computed for the budget's
    *owning* user (reuses ``budget_service``'s single source of truth)."""
    owner = get_user(budget.user_id)
    return budget_service.budget_to_response_dict(owner, budget)


# --- Pots ---------------------------------------------------------------


def list_all_pots(user_id=None):
    query = Pot.query
    if user_id is not None:
        query = query.filter(Pot.user_id == user_id)
    return query.order_by(Pot.created_at.desc()).all()


def get_pot(pot_id):
    pot = db.session.get(Pot, pot_id)
    if pot is None:
        raise ResourceNotFoundError("Pot not found")
    return pot


# --- Recurring bills ----------------------------------------------------


def list_all_recurring_bills(user_id=None):
    query = RecurringBill.query
    if user_id is not None:
        query = query.filter(RecurringBill.user_id == user_id)
    return query.order_by(RecurringBill.due_day).all()


def get_recurring_bill(bill_id):
    bill = db.session.get(RecurringBill, bill_id)
    if bill is None:
        raise ResourceNotFoundError("Recurring bill not found")
    return bill


def recurring_bill_to_admin_dict(bill):
    """Enriched bill dict with derived status, computed for the bill's
    *owning* user (reuses ``recurring_bill_service``'s single source of
    truth)."""
    owner = get_user(bill.user_id)
    return recurring_bill_service.recurring_bill_to_response_dict(owner, bill)


# --- Reports ----------------------------------------------------------------
# PRD doesn't specify the exact report shapes; these are a reasonable,
# easy-to-extend interpretation (simple counts/sums), documented as such.


def reports_summary():
    return {
        "total_users": User.query.count(),
        "total_categories": Category.query.count(),
        "total_transactions": Transaction.query.filter(
            Transaction.deleted_at.is_(None)
        ).count(),
        "total_budgets": Budget.query.count(),
        "total_pots": Pot.query.count(),
        "total_recurring_bills": RecurringBill.query.count(),
    }


def reports_transactions():
    active = Transaction.query.filter(Transaction.deleted_at.is_(None))
    total_count = active.count()
    income_total = int(
        db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.deleted_at.is_(None), Transaction.amount > 0)
        .scalar()
        or 0
    )
    expense_total = int(
        db.session.query(func.coalesce(func.sum(-Transaction.amount), 0))
        .filter(Transaction.deleted_at.is_(None), Transaction.amount < 0)
        .scalar()
        or 0
    )
    return {
        "total_count": total_count,
        "total_income": income_total,
        "total_expenses": expense_total,
    }


def reports_users():
    total = User.query.count()
    admins = User.query.filter_by(is_admin=True).count()
    return {
        "total_users": total,
        "admin_users": admins,
        "regular_users": total - admins,
    }
