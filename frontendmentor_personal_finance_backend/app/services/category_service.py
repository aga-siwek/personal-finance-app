"""Category business logic.

All DB access for categories lives here, not in the route handlers (per
CLAUDE.md: "Database queries go in models or services, never in route
handlers"). Categories are strictly per-user: every query filters on the
owning user's id, per the project-wide user-isolation rule.

This module is the foundational pass for the Categories component. The
duplicate-name handling, the ``delete_category`` guard shape, and default
seeding are implemented here because they are the parts most likely to be
gotten wrong later. Straightforward ``list``/``create``/``update`` bodies are
left to the follow-up pass (see the notes on each stub).
"""

from app.extensions import db
from app.models.category import Category
from app.models.transaction import Transaction

# PRD §5.2 default category set, seeded for every newly-signed-up user so the
# app is usable immediately without forcing setup first. Order is preserved.
DEFAULT_CATEGORY_NAMES = [
    "Entertainment",
    "Bills",
    "Groceries",
    "Dining Out",
    "Transportation",
    "Personal Care",
    "Shopping",
    "Lifestyle",
    "Education",
    "General",
]


class CategoryError(Exception):
    """Base class for category failures the routes turn into HTTP errors."""


class CategoryAlreadyExistsError(CategoryError):
    """Raised when a user already has a category with the given name."""


class CategoryNotFoundError(CategoryError):
    """Raised when a category does not exist for the requesting user."""


class CategoryInUseError(CategoryError):
    """Raised when a delete is attempted on a category still referenced by a
    transaction or a budget. Financial history is never cascade-deleted."""


def _normalize_name(name):
    return name.strip()


def get_category(user, category_id):
    """Return the user's own category by id, or raise ``CategoryNotFoundError``.

    Scoped by ``user_id`` so a user can never load another user's category.
    """
    category = Category.query.filter_by(id=category_id, user_id=user.id).first()
    if category is None:
        raise CategoryNotFoundError("Category not found")
    return category


def list_categories(user):
    """Return all of the user's categories, ordered by name."""
    return Category.query.filter_by(user_id=user.id).order_by(Category.name).all()


def create_category(user, name):
    """Create a category for ``user``.

    Raises ``CategoryAlreadyExistsError`` if the user already has a category
    with the same (normalized) name. The follow-up pass adds Marshmallow-level
    input validation in the schema; this service-layer duplicate check is the
    authoritative guard behind the DB unique constraint.
    """
    normalized_name = _normalize_name(name)

    existing = Category.query.filter_by(
        user_id=user.id, name=normalized_name
    ).first()
    if existing is not None:
        raise CategoryAlreadyExistsError("Category name already exists")

    category = Category(user_id=user.id, name=normalized_name)
    db.session.add(category)
    db.session.commit()
    return category


def update_category(user, category_id, name):
    """Rename the user's own category.

    Raises ``CategoryNotFoundError`` if the category isn't the user's, or
    ``CategoryAlreadyExistsError`` if the new name collides with another of
    the user's categories (the category being renamed is excluded from that
    check, so renaming "Groceries" to "Groceries" — i.e. no-op — is allowed).
    """
    category = get_category(user, category_id)
    normalized_name = _normalize_name(name)

    collision = Category.query.filter(
        Category.user_id == user.id,
        Category.name == normalized_name,
        Category.id != category.id,
    ).first()
    if collision is not None:
        raise CategoryAlreadyExistsError("Category name already exists")

    category.name = normalized_name
    db.session.commit()
    return category


def delete_category(user, category_id):
    """Delete the user's own category.

    Raises ``CategoryInUseError`` (never cascade-deletes financial history,
    per PRD §5.2) if the category is still referenced by any active
    (non-soft-deleted) transaction. A ``Budget`` check is added here once the
    Budgets component exists — not yet, since that model doesn't exist yet.
    """
    category = get_category(user, category_id)

    in_use = (
        Transaction.query.filter_by(category_id=category.id, user_id=user.id)
        .filter(Transaction.deleted_at.is_(None))
        .first()
    )
    if in_use is not None:
        raise CategoryInUseError(
            "Category is still referenced by a transaction and cannot be deleted"
        )

    db.session.delete(category)
    db.session.commit()


def seed_default_categories(user):
    """Create the PRD §5.2 default categories for a newly-signed-up user.

    Called by ``auth_service.signup`` (wired in by the follow-up pass, not
    here) so a new account has a usable category set immediately. All rows are
    added and committed in a single transaction. Returns the created
    categories in ``DEFAULT_CATEGORY_NAMES`` order.
    """
    categories = [
        Category(user_id=user.id, name=name) for name in DEFAULT_CATEGORY_NAMES
    ]
    db.session.add_all(categories)
    db.session.commit()
    return categories
