"""Pot business logic.

All DB access for pots lives here, not in the route handlers (per CLAUDE.md).
Pots are strictly per-user: every query filters on the owning user's id.

This module owns two things the rest of the app depends on and that are easy to
get wrong, so both are implemented and documented here in the foundational pass:

  1. ``compute_balance`` — the single source of truth for the user's "main
     balance". PRD §6 defines it as
     ``sum(transactions.amount) - sum(pots.total_saved)`` and forbids it from
     ever being a stored column. It lives HERE (not in a separate module)
     because pot add/withdraw is its primary consumer and must read it under
     the same lock; the Overview component will import it from this module when
     it needs the balance. Keeping one implementation avoids two formulas
     drifting apart.

  2. ``add_to_pot`` / ``withdraw_from_pot`` — atomic money movement, safe under
     concurrent requests (PRD §5.5 / §7, CLAUDE.md). See those docstrings for
     the exact locking protocol.
"""

from sqlalchemy import func

from app.extensions import db
from app.models.pot import Pot
from app.models.transaction import Transaction
from app.models.user import User


class PotError(Exception):
    """Base class for pot failures the routes turn into HTTP errors."""


class PotNotFoundError(PotError):
    """Raised when a pot does not exist for the requesting user."""


class InsufficientBalanceError(PotError):
    """Raised when an add-to-pot would drive the user's main balance negative
    (PRD §5.5). Nothing is mutated when this is raised."""


class InsufficientPotBalanceError(PotError):
    """Raised when a withdraw-from-pot would drive the pot total negative
    (PRD §5.5). Nothing is mutated when this is raised."""


class InvalidAmountError(PotError):
    """Raised when an add/withdraw amount is not a positive integer. The
    service is the authoritative guard; a schema also validates this later."""


def get_pot(user, pot_id):
    """Return the user's own pot by id, or raise ``PotNotFoundError``.

    Scoped by ``user_id`` so a user can never load another user's pot.
    """
    pot = Pot.query.filter_by(id=pot_id, user_id=user.id).first()
    if pot is None:
        raise PotNotFoundError("Pot not found")
    return pot


def list_pots(user):
    """Return all of the user's pots, newest first."""
    return (
        Pot.query.filter_by(user_id=user.id).order_by(Pot.created_at.desc()).all()
    )


def create_pot(user, name, target_amount, theme):
    """Create a pot for ``user`` and return it.

    ``target_amount`` is an integer in minor units (cents); ``theme`` is stored
    verbatim. ``total_saved`` starts at 0 — money only enters via
    ``add_to_pot``.
    """
    pot = Pot(
        user_id=user.id,
        name=name,
        target_amount=target_amount,
        theme=theme,
        total_saved=0,
    )
    db.session.add(pot)
    db.session.commit()
    return pot


def update_pot(user, pot_id, name=None, target_amount=None, theme=None):
    """Update the mutable fields of the user's own pot.

    Only ``name``, ``target_amount`` and ``theme`` are mutable here.
    ``total_saved`` is deliberately NOT updatable through this path — it is
    money and may only move through the atomic ``add_to_pot`` /
    ``withdraw_from_pot`` operations, so it can't be edited free-hand (which
    would bypass the balance checks and corrupt the derived balance). Passing
    ``None`` leaves a field unchanged.

    Raises ``PotNotFoundError`` if the pot isn't the user's.
    """
    pot = get_pot(user, pot_id)

    if name is not None:
        pot.name = name
    if target_amount is not None:
        pot.target_amount = target_amount
    if theme is not None:
        pot.theme = theme

    db.session.commit()
    return pot


def delete_pot(user, pot_id):
    """Delete the user's own pot.

    Raises ``PotNotFoundError`` if the pot isn't the user's.

    Deleting a pot with a non-zero ``total_saved`` releases that money back
    into the main balance as a side effect of the derived-balance formula:
    balance subtracts ``sum(pots.total_saved)``, so removing the pot row simply
    stops subtracting it. No separate balance write is needed (and none would
    be correct — balance is never stored).
    """
    pot = get_pot(user, pot_id)
    db.session.delete(pot)
    db.session.commit()


def compute_balance(user):
    """Return the user's current main balance, in minor units (cents).

    Formula (PRD §6, the one true definition, reused by Overview later):

        sum(transactions.amount for non-deleted rows) - sum(pots.total_saved)

    Income is positive and expenses negative, so the transaction sum is the net
    cash position; subtracting everything parked in pots yields the spendable
    main balance. Never stored — always computed here so it can't drift from
    its inputs. Returns an integer; 0 when the user has no transactions/pots.

    Callers that need this under concurrency (``add_to_pot``) must first take
    the user-row lock — see ``add_to_pot``. This function itself does not lock;
    it only reads.
    """
    tx_sum = (
        db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
        .scalar()
    )
    pot_sum = (
        db.session.query(func.coalesce(func.sum(Pot.total_saved), 0))
        .filter(Pot.user_id == user.id)
        .scalar()
    )
    return int(tx_sum or 0) - int(pot_sum or 0)


def add_to_pot(user, pot_id, amount):
    """Atomically move ``amount`` (cents) from the main balance into a pot.

    Concurrency protocol (PRD §5.5 / §7, CLAUDE.md — row locking, not
    read-then-write):

      1. Lock the owning ``User`` row (``SELECT ... FOR UPDATE``). This is the
         serialization point for ALL of the user's pot operations. The balance
         check spans every pot the user owns (balance subtracts the sum of all
         ``total_saved``), so two concurrent adds to *different* pots for the
         same user must still serialize against each other — locking only the
         single ``Pot`` row would not achieve that. Locking the user row does.
      2. Lock the specific ``Pot`` row too, scoped by ``user_id``; missing pot
         raises ``PotNotFoundError``.
      3. Read the balance (safe now — any other pot op for this user is blocked
         until this transaction commits).
      4. If ``balance < amount``: raise ``InsufficientBalanceError`` WITHOUT
         mutating anything (the transaction has made no changes, so this is a
         clean rollback).
      5. Otherwise ``pot.total_saved += amount`` and commit.

    ``with_for_update()`` is portable: a no-op on SQLite (single-process dev),
    a real ``SELECT ... FOR UPDATE`` on Postgres — so the later Postgres switch
    needs zero changes here.

    ``amount`` must be a positive integer, else ``InvalidAmountError``.
    """
    _require_positive_amount(amount)

    # (1) Serialize all of this user's pot operations on the user row.
    db.session.query(User).filter_by(id=user.id).with_for_update().first()

    # (2) Lock the target pot row, user-scoped.
    pot = (
        Pot.query.filter_by(id=pot_id, user_id=user.id).with_for_update().first()
    )
    if pot is None:
        raise PotNotFoundError("Pot not found")

    # (3) Read balance under the lock.
    balance = compute_balance(user)

    # (4) Reject before any mutation.
    if balance < amount:
        raise InsufficientBalanceError(
            "Adding to this pot would make the main balance negative"
        )

    # (5) Apply and commit.
    pot.total_saved += amount
    db.session.commit()
    return pot


def withdraw_from_pot(user, pot_id, amount):
    """Atomically move ``amount`` (cents) from a pot back to the main balance.

    Same locking protocol as ``add_to_pot`` (lock the ``User`` row, then the
    ``Pot`` row) so it serializes against concurrent pot operations for the
    same user. The check is simpler: if ``pot.total_saved < amount`` raise
    ``InsufficientPotBalanceError`` without mutating anything; otherwise
    ``pot.total_saved -= amount`` and commit.

    The main balance rises automatically — it is derived and subtracts
    ``total_saved``, so lowering ``total_saved`` raises the balance with no
    separate write.

    ``amount`` must be a positive integer, else ``InvalidAmountError``.
    """
    _require_positive_amount(amount)

    # Serialize against other pot ops for this user (consistency with add).
    db.session.query(User).filter_by(id=user.id).with_for_update().first()

    pot = (
        Pot.query.filter_by(id=pot_id, user_id=user.id).with_for_update().first()
    )
    if pot is None:
        raise PotNotFoundError("Pot not found")

    if pot.total_saved < amount:
        raise InsufficientPotBalanceError(
            "Withdrawing this amount would make the pot total negative"
        )

    pot.total_saved -= amount
    db.session.commit()
    return pot


def _require_positive_amount(amount):
    """Guard: money movement amounts must be positive integers.

    Rejects ``bool`` explicitly — ``True``/``False`` are ``int`` subclasses in
    Python and must never slip through as an amount of 1/0.
    """
    if isinstance(amount, bool) or not isinstance(amount, int) or amount <= 0:
        raise InvalidAmountError("Amount must be a positive integer")
