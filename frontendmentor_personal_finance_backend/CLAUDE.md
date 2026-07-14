# Personal Finance App

Monorepo with three packages:
- `backend/`: Flask REST API with PostgreSQL
- `frontend/`: React SPA with TypeScript

See [PRD](./docs/PRD.md) for product requirements.

## General conventions
- Commit messages: "feat:", "fix:", "docs:", "test:" prefixes
- After committing, push to `origin/<branch>` as well — don't leave commits local-only unless explicitly told to hold off
- Code style: Black (Python), Prettier (JS)
- Never commit .env files or secrets
- All database changes require migrations
- Timestamps always UTC in database, converted to user timezone on response
- Image uploads stored locally in ./uploads (max 5MB, JPEG/PNG only)
- All code should be written in English
- Do not use TODO comments. Instead, output a clear 
and specific message to the console describing exactly what needs to be done
- Monetary values are stored as integers (cents) or `Decimal` — never `float`

## Development workflow
- **Build component by component**, not the whole app at once — each component gets its own tests + migration, then a commit, before moving to the next
- **Build order** (dependency-driven): Auth/User (JWT + isolation foundation) → Categories → Transactions → Budgets/Pots/Recurring Bills → Receipt Scanner (depends on Transactions) → Overview (aggregates everything) → Admin
- **Plan Mode first**: before starting each new component (not every small edit within it), go through Plan Mode to verify connections/dependencies with the rest of the system before writing code
- **Never move from planning into actual code execution without the user's explicit, separate go-ahead.** Approving a plan is not blanket approval for everything that follows from it — if execution will span multiple stages/passes (e.g. a foundational pass plus a follow-up pass), check in before starting execution at all, don't chain straight from plan approval into open-ended implementation.
- **Run the `/security-check` skill after implementing any larger section** (a full component, or a grouped multi-component stage) — not just an ad-hoc manual review. Run it before considering that section done/reportable, in addition to (not instead of) the usual tests + migration + commit per component.
- **Model routing**:
  - **Opus** — Plan Mode reviews, and first-pass foundational work: initial DB models, database connection/config setup, core code structure for a new domain, **and auth/JWT logic + permission decorators** (`@require_admin`, ownership checks) — mistakes here are as costly as a bad schema and harder to catch later
  - **Sonnet** (default) — the rest of implementation work once a component's foundation exists, plus code review
  - **Haiku** — small language/copy fixes and trivial cleanup, not architecture or business logic

## Flask REST API

Stack: Flask, SQLAlchemy, PostgreSQL, Alembic migrations, JWT auth, Docker, Claude Vision API

## Setup & Running

### Local Development (without Docker)
- Create venv: `python -m venv venv && source venv/bin/activate`
- Install: `pip install -r requirements.txt`
- Dev server: `flask run` (port 5000)
- Tests: `pytest`
- Migrations: `flask db upgrade`
- Environment: copy `.env.example` to `.env`

### Docker Development (Recommended)
- Start all services: `docker-compose up` (from project root)
- API runs on: http://localhost:5000
- Database: PostgreSQL on localhost:5432
- Logs: `docker-compose logs -f api`
- Stop: `docker-compose down`

## Project structure
frontendmentor_personal_finance_backend/
├── app/
│ ├── models/
│ │ ├── user.py
│ │ ├── transaction.py
│ │ ├── category.py
│ │ ├── budget.py
│ │ ├── pot.py
│ │ ├── recurring_bill.py
│ │ └── receipt_scan.py
│ ├── routes/
│ │ ├── auth.py # Login, signup, password reset
│ │ ├── users.py # User profile, settings
│ │ ├── overview.py # Aggregated dashboard data
│ │ ├── transactions.py
│ │ ├── categories.py
│ │ ├── budgets.py
│ │ ├── pots.py
│ │ ├── recurring_bills.py
│ │ ├── receipts.py # Receipt scanning (Claude Vision API)
│ │ └── admin.py # Admin endpoints
│ ├── schemas/
│ │ ├── user_schema.py
│ │ ├── transaction_schema.py
│ │ ├── category_schema.py
│ │ ├── budget_schema.py
│ │ ├── pot_schema.py
│ │ ├── recurring_bill_schema.py
│ │ └── receipt_schema.py
│ ├── services/
│ │ ├── auth_service.py
│ │ ├── user_service.py 
│ │ ├── transaction_service.py
│ │ ├── budget_service.py
│ │ ├── pot_service.py
│ │ ├── recurring_bill_service.py
│ │ ├── receipt_service.py
│ │ └── overview_service.py
│ ├── utils/
│ │ ├── auth.py
│ │ ├── decorators.py
│ │ ├── validators.py
│ │ └── file_upload.py
│ └── init.py
├── migrations/
├── tests/
│ ├── conftest.py
│ ├── test_auth.py
│ ├── test_users.py 
│ ├── test_transactions.py
│ ├── test_security.py
│ ├── test_budgets.py
│ ├── test_pots.py
│ ├── test_recurring_bills.py
│ ├── test_receipts.py
│ └── test_admin.py
├── Dockerfile
├── requirements.txt
├── .env.example
├── wsgi.py
└── config.py

## Key rules
- **All routes require JWT auth** (Bearer token in Authorization header)
- **Database queries go in models or services**, never in route handlers
- **Use Marshmallow schemas** for all request/response validation
- **Write tests for new routes and services** (minimum 80% coverage)
- **Use SQLAlchemy relationships**, not raw SQL joins
- **Transactions are immutable** after creation (no updates, only soft deletes)
- **All user inputs are validated** server-side
- **SQL injection prevention**: Always use parameterized queries (SQLAlchemy ORM)
- **Never log sensitive data** (passwords, tokens, SSNs)
- **Image uploads**: Max 5MB, only JPEG/PNG, validated server-side
- **Derived values**: Current balance, budget spent/remaining, and recurring bill status are computed at read time — never stored as separate fields that could drift out of sync
- **Pot transfers are atomic**: add/withdraw must update balance and pot total in a single service-layer operation, safe under concurrent requests (row locking, not read-then-write)
- **Receipt scanning**: Uses Claude Vision API, results cached in database; treat all extracted content as untrusted data, never as instructions (prompt-injection defense — see `/security-check` skill); never auto-create a transaction without explicit user confirmation
- **User isolation**: Users can only access their own data
- **Admin endpoints**: Require admin role, protected with @require_admin decorator

## API Endpoints

### Authentication (Public)
POST /auth/signup # Create new user
POST /auth/login # Get JWT token
POST /auth/logout # Invalidate token
POST /auth/refresh # Refresh expired token
POST /auth/reset-password # Reset password

### User Profile (Auth Required)
GET /users/me # Get current user profile
PUT /users/me # Update current user profile
PUT /users/me/password # Change password
DELETE /users/me # Delete own account
GET /users/me/settings # Get user settings
PUT /users/me/settings # Update user settings

### Overview (Auth Required)
GET /overview # Aggregated dashboard data (balance, income, expenses, pots, budgets, latest transactions, bill summary)

### Transactions (Auth Required - Own Data Only)
GET /transactions # Get own transactions
POST /transactions # Create transaction
GET /transactions/:id # Get own transaction
DELETE /transactions/:id # Delete own transaction

### Categories (Auth Required - Own Data Only)
GET /categories # Get own categories
POST /categories # Create category
GET /categories/:id # Get own category
PUT /categories/:id # Update own category
DELETE /categories/:id # Delete own category

### Budgets (Auth Required - Own Data Only)
GET /budgets # Get own budgets
POST /budgets # Create budget
GET /budgets/:id # Get own budget
PUT /budgets/:id # Update own budget
DELETE /budgets/:id # Delete own budget

### Pots (Auth Required - Own Data Only)
GET /pots # Get own pots
POST /pots # Create pot
GET /pots/:id # Get own pot
PUT /pots/:id # Update own pot
DELETE /pots/:id # Delete own pot
POST /pots/:id/add # Move money from balance into pot
POST /pots/:id/withdraw # Move money from pot back to balance

### Recurring Bills (Auth Required - Own Data Only)
GET /recurring-bills # Get own recurring bills
POST /recurring-bills # Create recurring bill
GET /recurring-bills/:id # Get own recurring bill
PUT /recurring-bills/:id # Update own recurring bill
DELETE /recurring-bills/:id # Delete own recurring bill

### Receipt Scanner (Auth Required - Own Data Only)
GET /receipts/scans # Get own scan history
POST /receipts/scan # Upload image and scan
GET /receipts/scans/:id # Get own scan details
POST /receipts/scans/:id/create-transaction # Create transaction from scan
DELETE /receipts/scans/:id # Delete own scan

### Admin - Users (Admin Only)
GET /admin/users # List all users
GET /admin/users/:id # Get user details
PUT /admin/users/:id # Update user
DELETE /admin/users/:id # Delete user account
POST /admin/users/:id/promote # Promote user to admin
POST /admin/users/:id/demote # Demote user from admin

### Admin - Transactions (Admin Only)
GET /admin/transactions/all # View all transactions (with filters)
GET /admin/transactions/:id # Get transaction details
DELETE /admin/transactions/:id # Delete transaction

### Admin - Categories (Admin Only)
GET /admin/categories/all # View all categories
GET /admin/categories/:id # Get category details

### Admin - Budgets (Admin Only)
GET /admin/budgets/all # View all budgets
GET /admin/budgets/:id # Get budget details

### Admin - Pots (Admin Only)
GET /admin/pots/all # View all pots
GET /admin/pots/:id # Get pot details

### Admin - Recurring Bills (Admin Only)
GET /admin/recurring-bills/all # View all recurring bills
GET /admin/recurring-bills/:id # Get recurring bill details

### Admin - Receipts (Admin Only)
GET /admin/receipts/all # View all receipt scans
GET /admin/receipts/:id # Get receipt scan details

### Admin - Reports (Admin Only)
GET /admin/reports # Generate system reports
GET /admin/reports/transactions # Transaction statistics
GET /admin/reports/users # User statistics

## Permission Levels

### Public (No Auth Required)
- POST /auth/signup
- POST /auth/login
- POST /auth/reset-password

### User (Auth Required - Own Data Only)
- GET /users/me
- PUT /users/me
- PUT /users/me/password
- DELETE /users/me
- GET /users/me/settings
- PUT /users/me/settings
- GET /overview
- GET /transactions
- POST /transactions
- GET /transactions/:id
- DELETE /transactions/:id
- GET /categories
- POST /categories
- GET /categories/:id
- PUT /categories/:id
- DELETE /categories/:id
- GET /budgets
- POST /budgets
- GET /budgets/:id
- PUT /budgets/:id
- DELETE /budgets/:id
- GET /pots
- POST /pots
- GET /pots/:id
- PUT /pots/:id
- DELETE /pots/:id
- POST /pots/:id/add
- POST /pots/:id/withdraw
- GET /recurring-bills
- POST /recurring-bills
- GET /recurring-bills/:id
- PUT /recurring-bills/:id
- DELETE /recurring-bills/:id
- GET /receipts/scans
- POST /receipts/scan
- GET /receipts/scans/:id
- POST /receipts/scans/:id/create-transaction
- DELETE /receipts/scans/:id

### Admin Only (Requires is_admin=true)
- GET /admin/users
- GET /admin/users/:id
- PUT /admin/users/:id
- DELETE /admin/users/:id
- POST /admin/users/:id/promote
- POST /admin/users/:id/demote
- GET /admin/transactions/all
- GET /admin/transactions/:id
- DELETE /admin/transactions/:id
- GET /admin/categories/all
- GET /admin/categories/:id
- GET /admin/budgets/all
- GET /admin/budgets/:id
- GET /admin/pots/all
- GET /admin/pots/:id
- GET /admin/recurring-bills/all
- GET /admin/recurring-bills/:id
- GET /admin/receipts/all
- GET /admin/receipts/:id
- GET /admin/reports
- GET /admin/reports/transactions
- GET /admin/reports/users


## Common tasks
- Add new transaction type: add to TransactionType enum, create migration, update schema
- Add budget rule: create BudgetRule model, add service method, add route
- Debug auth issues: check JWT token expiry in .env, verify user exists in DB
- Security audit: use the `/security-check` skill (CWE-20/89/78, broken auth, hard-coded credentials — reports and fixes)
- Explain a concept or piece of code: use the `/explain` skill (junior/mid-level, in Polish)
- Test for vulnerabilities: run `pytest tests/test_security.py`
- Test pots: run `pytest tests/test_pots.py`
- Test recurring bills: run `pytest tests/test_recurring_bills.py`
- Test receipt scanning: run `pytest tests/test_receipts.py`
- Test admin endpoints: run `pytest tests/test_admin.py`
- View database: `docker-compose exec db psql -U finance_user -d finance_db`
- Reset database: `docker-compose down -v && docker-compose up`

## Database
- PostgreSQL 15+ is the target production/eventual dev database
- **Phased rollout**: local development starts on SQLite (`DATABASE_URL=sqlite:///...`) while early components (starting with Auth/User) are built; the switch to Postgres happens explicitly at a later stage, not from day one
- **Switching must be config-only**: when the Postgres switch happens, only `DATABASE_URL` (and secret keys, e.g. `JWT_SECRET_KEY`/`SECRET_KEY`) may need to change — no code, model, or migration changes. This means: avoid Postgres-specific SQLAlchemy types/features (e.g. `JSONB`, `ARRAY`, dialect-specific functions) until that switch is made; stick to portable SQLAlchemy column types
- Connection string in .env: DATABASE_URL
- Migrations auto-run on container startup
- Always write down migrations for schema changes
