"""Marshmallow schemas for pot request validation."""

from marshmallow import Schema, fields, validate


class PotCreateSchema(Schema):
    """Validates POST /pots."""

    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    target_amount = fields.Integer(required=True, validate=validate.Range(min=1))
    theme = fields.String(required=True, validate=validate.Length(min=1, max=50))


class PotUpdateSchema(Schema):
    """Validates PUT /pots/:id. All fields optional. ``total_saved`` is
    deliberately not present — it only moves via add/withdraw."""

    name = fields.String(validate=validate.Length(min=1, max=255))
    target_amount = fields.Integer(validate=validate.Range(min=1))
    theme = fields.String(validate=validate.Length(min=1, max=50))


class PotAmountSchema(Schema):
    """Validates POST /pots/:id/add and /pots/:id/withdraw."""

    amount = fields.Integer(required=True, validate=validate.Range(min=1))
