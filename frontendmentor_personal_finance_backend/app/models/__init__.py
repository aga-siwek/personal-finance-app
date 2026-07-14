"""SQLAlchemy models.

Importing the models here ensures they are registered on ``db.metadata`` so
that Alembic autogenerate and ``db.create_all`` can see every table.
"""

from app.models.budget import Budget
from app.models.category import Category
from app.models.pot import Pot
from app.models.recurring_bill import RecurringBill
from app.models.token_blocklist import TokenBlocklist
from app.models.transaction import Transaction
from app.models.user import User

__all__ = [
    "User",
    "TokenBlocklist",
    "Category",
    "Transaction",
    "Budget",
    "Pot",
    "RecurringBill",
]
