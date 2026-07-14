"""Overview aggregation (PRD §5.8).

Composes balance, income/expenses, pot and budget summaries, latest
transactions, and recurring-bill status counts into a single dashboard
payload, so the frontend never has to re-derive any of this from raw lists
itself. Pure composition over the already-built per-domain services — no new
model, nothing stored here.
"""

from sqlalchemy import func

from app.extensions import db
from app.models.transaction import Transaction
from app.services import budget_service, pot_service, recurring_bill_service
from app.services import transaction_service

# "Top N" for pots/budgets/latest transactions (design decision, Stage 2 plan).
OVERVIEW_TOP_N = 5


def _compute_income_and_expenses(user):
    """All-time sums, consistent with how "current balance" is defined (PRD
    §6: balance is derived from the full transaction history, not a period).
    """
    income = (
        db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
            Transaction.amount > 0,
        )
        .scalar()
    )
    expenses = (
        db.session.query(func.coalesce(func.sum(-Transaction.amount), 0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
            Transaction.amount < 0,
        )
        .scalar()
    )
    return int(income or 0), int(expenses or 0)


def _budget_spent_ratio(budget_dict):
    """Spent/limit ratio for ranking budgets "most over-budget first". A
    zero-limit budget (shouldn't happen — schema requires max_spend >= 1, but
    guard anyway) sorts last rather than dividing by zero."""
    if not budget_dict["max_spend"]:
        return 0
    return budget_dict["spent"] / budget_dict["max_spend"]


def get_overview(user):
    """Build the full dashboard payload for ``user``."""
    income, expenses = _compute_income_and_expenses(user)
    balance = pot_service.compute_balance(user)

    pots = pot_service.list_pots(user)
    top_pots = sorted(pots, key=lambda p: p.total_saved, reverse=True)[:OVERVIEW_TOP_N]
    pots_total_saved = sum(p.total_saved for p in pots)

    budgets = budget_service.list_budgets(user)
    budgets_with_spent = [
        budget_service.budget_to_response_dict(user, b) for b in budgets
    ]
    top_budgets = sorted(
        budgets_with_spent, key=_budget_spent_ratio, reverse=True
    )[:OVERVIEW_TOP_N]

    latest_transactions, _total = transaction_service.list_transactions(
        user, page=1, per_page=OVERVIEW_TOP_N, sort="latest"
    )

    recurring_bills = recurring_bill_service.list_recurring_bills(user)
    status_counts = {"paid": 0, "due_soon": 0, "upcoming": 0}
    for bill in recurring_bills:
        status_counts[recurring_bill_service.compute_status(user, bill)] += 1

    return {
        "balance": balance,
        "income": income,
        "expenses": expenses,
        "pots": {
            "total_count": len(pots),
            "total_saved": pots_total_saved,
            "top": [p.to_dict() for p in top_pots],
        },
        "budgets": {
            "total_count": len(budgets),
            "top": top_budgets,
        },
        "latest_transactions": [t.to_dict() for t in latest_transactions],
        "recurring_bills": status_counts,
    }
