"""Marshmallow schemas for recurring bill request validation."""

from marshmallow import Schema, fields, validate

_SORT_CHOICES = (
    "latest",
    "oldest",
    "name_asc",
    "name_desc",
    "amount_asc",
    "amount_desc",
)


class RecurringBillCreateSchema(Schema):
    """Validates POST /recurring-bills."""

    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    category_id = fields.Integer(required=True)
    amount = fields.Integer(required=True, validate=validate.Range(min=1))
    due_day = fields.Integer(required=True, validate=validate.Range(min=1, max=31))


class RecurringBillUpdateSchema(Schema):
    """Validates PUT /recurring-bills/:id. All fields optional."""

    title = fields.String(validate=validate.Length(min=1, max=255))
    category_id = fields.Integer()
    amount = fields.Integer(validate=validate.Range(min=1))
    due_day = fields.Integer(validate=validate.Range(min=1, max=31))


class RecurringBillListQuerySchema(Schema):
    """Validates GET /recurring-bills query params."""

    search = fields.String(load_default=None, allow_none=True)
    sort = fields.String(load_default="latest", validate=validate.OneOf(_SORT_CHOICES))
