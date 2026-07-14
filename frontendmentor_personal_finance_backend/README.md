# Personal Finance App — Backend

Flask REST API for the Personal Finance App (Frontend Mentor challenge + a
receipt-scanning addition). See [`docs/PRD.md`](./docs/PRD.md) for the full
product spec and [`CLAUDE.md`](./CLAUDE.md) for coding conventions, build
order, and API reference.

## Stack

Flask, SQLAlchemy, Alembic migrations (Flask-Migrate), JWT auth
(Flask-JWT-Extended), Marshmallow validation, Docker.

Local development runs on **SQLite** with zero extra infrastructure. The
switch to **PostgreSQL** (for later stages / production) is config-only —
it only requires changing `DATABASE_URL` (and secret keys), never code.

## Setup

```bash
cp env.example .env
```

Edit `.env` and set real values for `SECRET_KEY` and `JWT_SECRET_KEY` at
minimum. The default `DATABASE_URL` (`sqlite:///dev.db`) works as-is.

### Local development (without Docker)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

flask db upgrade      # applies migrations, creates instance/dev.db
flask run             # http://localhost:5000
```

Run tests:

```bash
pytest -v
```

Tests run against a temporary SQLite database (see `tests/conftest.py`) —
no Docker or Postgres required.

### Docker development

Set `DATABASE_URL` in `.env` to the Postgres URL for the `db` service (see
the commented example in `env.example`) before using this path.

```bash
docker-compose up          # API on http://localhost:5000, Postgres on 5432
docker-compose logs -f api
docker-compose exec db psql -U finance_user -d finance_db
docker-compose down         # stop
docker-compose down -v      # stop and wipe the Postgres volume
```

Migrations run automatically on container startup.

## Project structure

See [`CLAUDE.md`](./CLAUDE.md) for the full project layout and API endpoint
reference. Current state: the **Auth/User** component (JWT auth + user
profile) is implemented; later components (Categories, Transactions,
Budgets, Pots, Recurring Bills, Receipt Scanner, Overview, Admin) follow the
build order documented there.
