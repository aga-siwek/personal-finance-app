# Personal Finance App — Backend

Flask REST API for the [Frontend Mentor Personal Finance App
challenge](https://www.frontendmentor.io/challenges/personal-finance-app-JfjtZgyMt1),
plus a receipt-scanning addition beyond the base challenge. The API is the
single source of truth for all money math (balance, budget spent/remaining,
recurring bill status) — the frontend never computes these itself.

See [`docs/PRD.md`](./docs/PRD.md) for the full product spec and
[`CLAUDE.md`](./CLAUDE.md) for coding conventions, build order, and the
complete API endpoint reference.

## Status

Stage 2 of the build order is complete: **Auth/User, Categories,
Transactions, Budgets, Pots, Recurring Bills, Overview, and Admin** are
implemented and tested (123 tests passing). The **Receipt Scanner** and the
**switch from SQLite to PostgreSQL** are Stage 3, not yet started.

## Tech stack

| | |
|---|---|
| Framework | Flask 3 |
| ORM / migrations | SQLAlchemy 2 + Flask-Migrate (Alembic) |
| Auth | Flask-JWT-Extended (access + refresh tokens, DB-backed logout blocklist) |
| Validation | Marshmallow |
| Password hashing | Flask-Bcrypt |
| Database | SQLite (dev, zero infra) → PostgreSQL (config-only switch, later stage) |
| Server | Gunicorn (Docker) / Flask dev server (local) |
| Testing | pytest, against a temporary SQLite DB |

Local development runs on **SQLite** with zero extra infrastructure. The
later switch to **PostgreSQL** is config-only — it only requires changing
`DATABASE_URL` (and secret keys), never application code. See `CLAUDE.md` §
Database for the standing rule this follows.

## Getting started

### Prerequisites

- Python 3.9+
- (Optional) Docker + Docker Compose, only needed once the project switches
  to the Postgres path

### Setup

```bash
cp env.example .env
```

Edit `.env` and set real values for `SECRET_KEY` and `JWT_SECRET_KEY` at
minimum — never commit `.env`. The default `DATABASE_URL`
(`sqlite:///dev.db`) works as-is for local development.

| Variable | Purpose | Local default |
|---|---|---|
| `FLASK_CONFIG` | `development` / `testing` / `production` | `development` |
| `SECRET_KEY` | Flask session/crypto secret | placeholder — change per environment |
| `JWT_SECRET_KEY` | JWT signing secret | placeholder — change per environment |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///dev.db` |
| `JWT_ACCESS_TOKEN_EXPIRES` | Access token lifetime (seconds) | `900` |
| `JWT_REFRESH_TOKEN_EXPIRES` | Refresh token lifetime (seconds) | `2592000` |
| `UPLOAD_FOLDER` | Receipt image storage path (Stage 3) | `./uploads` |
| `CORS_ORIGINS` | Comma-separated allowed origins, or `*` | `*` |

### Run locally (without Docker)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

flask db upgrade      # applies migrations, creates instance/dev.db
flask run             # http://localhost:5000
```

`flask db upgrade` only needs to be re-run when a new migration lands (e.g.
after pulling changes) — not on every server start.

### Run with Docker

The Docker path targets PostgreSQL. Point `DATABASE_URL` in `.env` at the
Postgres URL for the `db` service (see the commented example in
`env.example`) before using it.

```bash
docker-compose up          # API on http://localhost:5000, Postgres on 5432
docker-compose logs -f api
docker-compose exec db psql -U finance_user -d finance_db
docker-compose down         # stop
docker-compose down -v      # stop and wipe the Postgres volume
```

Migrations run automatically on container startup.

## Testing

```bash
pytest -v
```

Tests run against a temporary, per-test SQLite database (see
`tests/conftest.py`) — no Docker or Postgres required. 123 tests cover
auth/JWT, user isolation, every CRUD route, the atomic pot add/withdraw
concurrency guard, derived budget/recurring-bill/overview calculations, and
a security-focused suite (SQL-injection-shaped input, tampered JWTs,
`password_hash` never leaking into a response).

Security is also checked with the project's `/security-check` skill after
every larger section is implemented (see `CLAUDE.md` § Development
workflow) — not only via the automated test suite.

## API reference

Full endpoint list, request/response shapes, and permission levels are
documented in [`CLAUDE.md`](./CLAUDE.md#api-endpoints). A ready-to-import
Postman collection with example request bodies for every implemented
endpoint is at [`docs/postman_collection.json`](./docs/postman_collection.json).

Implemented resource groups: `/auth`, `/users/me`, `/categories`,
`/transactions`, `/budgets`, `/pots`, `/recurring-bills`, `/overview`,
`/admin/*`. All routes except `POST /auth/signup` and `POST /auth/login`
require a JWT (`Authorization: Bearer <token>`); `/admin/*` additionally
requires `is_admin`.

## Project structure

```
app/
├── models/      SQLAlchemy models (one table each)
├── services/    All business logic + DB access (never in routes)
├── routes/      Flask blueprints — validation + service calls only
├── schemas/     Marshmallow request/response validation
└── utils/       Auth helpers, permission decorators, validators
migrations/      Alembic migration history
tests/           pytest suite, one file per component + a security suite
docs/            PRD, preview images, Postman collection
```

See `CLAUDE.md` for the full annotated tree and the dependency-driven build
order (Auth/User → Categories → Transactions → Budgets/Pots/Recurring
Bills → Receipt Scanner → Overview → Admin — Overview/Admin were built ahead
of the Receipt Scanner in this repo, with the Scanner deferred to Stage 3).

## Security

- Every input is validated through a Marshmallow schema before it reaches a
  service or the database.
- All database access goes through SQLAlchemy's ORM — no raw SQL.
- Every non-admin query is scoped to the authenticated user's id; admin
  routes are gated by a dedicated `@require_admin` decorator.
- Passwords are hashed with bcrypt and never appear in any API response or
  log line.
- Pot transfers (add/withdraw) are atomic under concurrency via row-level
  locking, not read-then-write.

See [`CLAUDE.md`](./CLAUDE.md) for the full rule set, and run `/security-check`
(a Claude Code skill in this repo) for a CWE-mapped audit.
