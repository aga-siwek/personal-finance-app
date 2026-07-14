"""Marshmallow schemas for admin request validation."""

from marshmallow import Schema, ValidationError, fields, validate, validates_schema


class AdminUpdateUserSchema(Schema):
    """Validates PUT /admin/users/:id. Password is deliberately not a field
    here — admins never set a user's password directly."""

    name = fields.String(validate=validate.Length(min=1, max=255))
    email = fields.Email(validate=validate.Length(max=255))
    timezone = fields.String(validate=validate.Length(min=1, max=64))

    @validates_schema
    def validate_at_least_one_field(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one field is required.")


class AdminListUsersQuerySchema(Schema):
    """Validates GET /admin/users query params. Same bounds as the
    transaction list schema (per_page capped at 100) — admin-gated doesn't
    mean unbounded; an oversized per_page still forces the DB to materialize
    and serialize an unbounded result set."""

    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))


class AdminListTransactionsQuerySchema(Schema):
    """Validates GET /admin/transactions/all query params."""

    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    user_id = fields.Integer(load_default=None, allow_none=True)
    category_id = fields.Integer(load_default=None, allow_none=True)


class AdminResourceFilterQuerySchema(Schema):
    """Validates the GET .../all query params shared by categories, budgets,
    pots, and recurring bills (an optional user_id filter, no pagination —
    these are not expected to grow unbounded the way transactions can)."""

    user_id = fields.Integer(load_default=None, allow_none=True)
