"""Marshmallow schemas for budget request validation."""

from marshmallow import Schema, fields, validate


class BudgetCreateSchema(Schema):
    """Validates POST /budgets."""

    category_id = fields.Integer(required=True)
    max_spend = fields.Integer(required=True, validate=validate.Range(min=1))
    theme = fields.String(required=True, validate=validate.Length(min=1, max=50))


class BudgetUpdateSchema(Schema):
    """Validates PUT /budgets/:id. Both fields optional; category_id is not
    updatable (it defines the budget's identity)."""

    max_spend = fields.Integer(validate=validate.Range(min=1))
    theme = fields.String(validate=validate.Length(min=1, max=50))
