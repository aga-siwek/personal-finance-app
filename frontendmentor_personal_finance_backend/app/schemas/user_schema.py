"""Marshmallow schemas for auth and user-profile request validation."""

from zoneinfo import available_timezones

from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.utils.validators import PASSWORD_MIN_LENGTH

_VALID_TIMEZONES = available_timezones()


class SignupSchema(Schema):
    """Validates the POST /auth/signup body."""

    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=255),
    )
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.String(
        required=True,
        validate=validate.Length(min=PASSWORD_MIN_LENGTH),
    )


class LoginSchema(Schema):
    """Validates the POST /auth/login body.

    Length/format are kept minimal here on purpose: login must not leak which
    field was wrong, so we only require the fields be present and strings.
    """

    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=1))


class UpdateUserSchema(Schema):
    """Validates PUT /users/me.

    Both fields are optional (partial update), but at least one must be
    supplied — an empty body isn't a meaningful update request.
    """

    name = fields.String(validate=validate.Length(min=1, max=255))
    email = fields.Email(validate=validate.Length(max=255))

    @validates_schema
    def validate_at_least_one_field(self, data, **kwargs):
        if not data:
            raise ValidationError("At least one of 'name' or 'email' is required.")


class ChangePasswordSchema(Schema):
    """Validates PUT /users/me/password."""

    current_password = fields.String(required=True, validate=validate.Length(min=1))
    new_password = fields.String(
        required=True, validate=validate.Length(min=PASSWORD_MIN_LENGTH)
    )


class SettingsSchema(Schema):
    """Validates GET/PUT /users/me/settings.

    v1 settings is timezone only — the data model has no separate Settings
    table, and multi-currency is an explicit PRD non-goal.
    """

    timezone = fields.String(required=True, validate=validate.OneOf(_VALID_TIMEZONES))
