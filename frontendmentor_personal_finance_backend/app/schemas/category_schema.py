"""Marshmallow schema for category request validation."""

from marshmallow import Schema, fields, validate


class CategorySchema(Schema):
    """Validates POST /categories and PUT /categories/:id bodies."""

    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
