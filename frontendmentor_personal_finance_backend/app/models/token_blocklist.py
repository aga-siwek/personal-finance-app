"""JWT token blocklist model.

Backs logout / token revocation. Stored in the database (not an in-memory
set) so revocation is consistent across gunicorn's multiple worker
processes and survives restarts.
"""

from datetime import datetime, timezone

from app.extensions import db


def _utcnow():
    return datetime.now(timezone.utc)


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)

    def __repr__(self):
        return "<TokenBlocklist id={}>".format(self.id)
