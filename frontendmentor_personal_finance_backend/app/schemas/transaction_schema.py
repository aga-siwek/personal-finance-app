"""Marshmallow schemas for transaction request validation."""

from marshmallow import Schema, fields, validate

_SORT_CHOICES = (
    "latest",
    "oldest",
    "name_asc",
    "name_desc",
    "amount_asc",
    "amount_desc",
)


class TransactionCreateSchema(Schema):
    """Validates POST /transactions.

    ``source`` is deliberately not a field here — this endpoint always creates
    a ``manual`` transaction (PRD §5.3); ``receipt_scan`` is only ever set by
    the (not-yet-built) receipt scan confirmation path.
    """

    category_id = fields.Integer(required=True)
    recipient_name = fields.String(
        required=True, validate=validate.Length(min=1, max=255)
    )
    amount = fields.Integer(
        required=True, validate=validate.NoneOf([0], error="Amount must not be zero.")
    )
    transaction_date = fields.Date(required=True)


class TransactionListQuerySchema(Schema):
    """Validates GET /transactions query params."""

    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    search = fields.String(load_default=None, allow_none=True)
    sort = fields.String(load_default="latest", validate=validate.OneOf(_SORT_CHOICES))
    category_id = fields.String(load_default=None, allow_none=True)
