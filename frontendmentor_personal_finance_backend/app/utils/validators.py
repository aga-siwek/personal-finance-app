"""Reusable input validators.

These enforce the auth rules from PRD §5.1: valid email format and a minimum
password length of 8 characters. No extra complexity rules are invented here
beyond what the spec states.
"""

import re

# Pragmatic email pattern: exactly one "@", non-empty local part, a dotted
# domain with a 2+ char TLD. Deliberately simple — Marshmallow's validate.Email
# is used at the schema layer too; this helper backs non-schema call sites.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")

PASSWORD_MIN_LENGTH = 8


def is_valid_email(email):
    """Return True if ``email`` looks like a syntactically valid address."""
    if not isinstance(email, str):
        return False
    return bool(_EMAIL_RE.match(email.strip()))


def is_valid_password(password):
    """Return True if ``password`` meets the minimum length (PRD §5.1)."""
    if not isinstance(password, str):
        return False
    return len(password) >= PASSWORD_MIN_LENGTH
