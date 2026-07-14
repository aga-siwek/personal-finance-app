"""Flask extension instances.

These are instantiated here without an app and bound later in
``create_app`` via ``.init_app(app)``. Keeping them in their own module
avoids circular imports (models import ``db`` from here, and ``create_app``
imports both models and these extensions).
"""

from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()
