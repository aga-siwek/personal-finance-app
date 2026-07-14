"""WSGI entry point.

Used by gunicorn (``wsgi:app``) and by ``flask`` CLI commands. Replaces the
old app.py Hello-World module.
"""

from app import create_app

app = create_app()


if __name__ == "__main__":
    app.run()
