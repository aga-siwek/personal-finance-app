# Personal Finance App — Backend PRD

Status: Draft v1
Scope: `backend/` only (Flask REST API). UI/UX behavior lives in a separate
frontend PRD — this document defines what the API must guarantee: data
model, business rules, validation, and security. Feature reference:
[Frontend Mentor — Personal Finance App](https://www.frontendmentor.io/challenges/personal-finance-app-JfjtZgyMt1),
plus one addition beyond the base challenge: automatic receipt scanning.

## 1. Purpose

Provide a REST API that lets an authenticated user manage their own
transactions, category budgets, savings pots, and recurring bills, and
that can turn a photographed receipt into a transaction automatically. The
API is the source of truth for all money math (balances, budget
spent/remaining, pot totals) — the frontend never computes these itself.

## 2. Goals

- Every monetary figure the API returns is correct and internally
  consistent (balance always reflects transactions + pot movements; budget
  spent/remaining always reflects real transactions in that category).
- Every user's data is fully isolated from every other user's, at the query
  level, everywhere (`CLAUDE.md` → "User isolation").
- Receipt scanning never creates a transaction without explicit user
  confirmation, and never lets content extracted from an image influence
  anything beyond the fields of that one proposed transaction.
- All of the above hold even under concurrent requests (e.g. two "add
  money to pot" calls in flight at once must not corrupt the pot total or
  the balance).

## 3. Non-goals (v1)

- Bank/card account linking or live transaction import.
- Multi-currency (single currency, stored as integer minor units).
- Multi-user/shared accounts (households, joint pots).
- Auto-generating transactions from recurring bills, or notifying the user
  about them (v1 only tracks and reports recurring bill state).
- Editing a transaction after creation (immutable by design — only create,
  read, soft-delete).

## 4. Roles

- **User** — full CRUD on their own transactions, categories, budgets,
  pots, recurring bills, and receipt scans. No visibility into other
  users' data.
- **Admin** — read access across all users' data plus user management
  (`/api/admin/*`), for support/ops. Not a money-management persona.

## 5. Functional requirements by domain

### 5.1 Auth

- Sign up: name, email (unique, validated format), password (min 8 chars,
  hashed — never stored or logged in plaintext).
- Login returns a JWT; logout invalidates it; refresh extends it; password
  reset flow issues a new one.
- Every non-public endpoint requires a valid JWT; every request resolves
  to exactly one authenticated user.

### 5.2 Categories

- User-scoped, user-owned: create, rename, delete.
- Seed each new user with a default category set on signup (e.g.
  Entertainment, Bills, Groceries, Dining Out, Transportation, Personal
  Care, Shopping, Lifestyle, Education, General) so the app is usable
  immediately without forcing setup first.
- A category cannot be deleted while it's referenced by any transaction or
  an active budget — reject with a clear error, don't cascade-delete
  financial history.

### 5.3 Transactions

- Create: recipient/sender name, amount (signed — positive = income,
  negative = expense), category, transaction date, source
  (`manual` or `receipt_scan`).
- Read: list (paginated) and single-record fetch, both scoped to the
  requesting user only.
- List supports: text search (recipient/sender name), sort
  (`latest`, `oldest`, `name_asc`, `name_desc`, `amount_asc`,
  `amount_desc`), and filter by category (including "all").
- Delete is soft-delete only. **No update endpoint** — transactions are
  immutable once created; a mistake requires delete + re-create.
- A transaction created from a confirmed receipt scan stores a reference
  back to that scan.

### 5.4 Budgets

- One budget per (user, category) pair: category, max spend, theme
  identifier (an opaque string/enum persisted and returned as-is for the
  frontend to render — the API doesn't interpret it).
- Create/update/delete, scoped to the owning user.
- Spent and remaining are **derived at read time** from the sum of that
  user's transactions in that category for the current period — never
  stored as separate fields that could drift out of sync.
- Creating a second budget for a category that already has one is
  rejected (one budget per category, not additive).

### 5.5 Pots

- Create/update/delete: name, target amount, theme identifier — scoped to
  the owning user.
- Two money-movement actions, each atomic and transactional:
  - **Add to pot**: decreases the user's main balance, increases the
    pot's total by the same amount. Reject if it would drive the main
    balance negative.
  - **Withdraw from pot**: increases the user's main balance, decreases
    the pot's total by the same amount. Reject if it would drive the pot
    total negative.
- Both actions must be implemented as a single service-layer operation
  (not two separate writes the frontend orchestrates) so a partial failure
  can't leave balance and pot total inconsistent.
- "Main balance" itself is derived (transactions + net pot movements), not
  a mutable field — see §6.

### 5.6 Recurring bills

- Create/update/delete: title, category, amount, due day of month —
  scoped to the owning user.
- Read/list must report, per bill, a derived status for the current cycle:
  `paid` (a matching transaction already exists this cycle), `upcoming`
  (not yet due), or `due_soon` (due within a configurable threshold, e.g.
  3 days).
- List supports search (title) and the same sort options as transactions.
- v1 does not auto-create transactions for recurring bills or send
  reminders — status is informational only.

### 5.7 Receipt scanner (new — beyond the base challenge)

Lets a user upload a photo of a receipt and get a transaction proposed
automatically instead of typing it in. (Referred to elsewhere as "recipe
scanning" — using "receipt" here since that matches the actual
functionality; naming will be reconciled when `CLAUDE.md` is next updated.)

- Upload: image only, JPEG/PNG, max 5MB, stored in `./uploads`, rejected
  server-side if type/size don't match (per `CLAUDE.md`'s upload rule).
- Backend sends the image to the Claude Vision API and extracts:
  merchant/recipient name, total amount, transaction date, and a
  best-effort category suggestion constrained to the user's own category
  list — never a free-text/invented category.
- The model's response is validated against a strict schema before
  anything is persisted or returned. A scan is stored with a status:
  `pending`, `processed`, or `failed` (failed/low-confidence scans are
  still recorded, not silently dropped, so the user can see the upload
  registered).
- The API never creates a transaction directly from a scan. It returns the
  extracted (and possibly low-confidence) fields for the user to review
  and edit client-side, then creates the transaction only on an explicit
  confirm call, using the (possibly edited) fields the client sends back —
  not by re-reading its own cached extraction.
- **Prompt injection defense**: the prompt sent to the Vision API must
  instruct it to treat the image content as data to extract, and to ignore
  any instruction-like text that appears within it. Extracted output is
  data, never trusted as instructions for anything else the backend does.
- List, fetch, and delete a user's own scan history.

### 5.8 Overview aggregation

- One endpoint (or a small fixed set) that returns everything the
  dashboard needs in a single round trip: current balance, income,
  expenses, pot totals (all + top N), budget totals (all + top N with
  spent/limit), latest N transactions, recurring-bill summary counts. The
  frontend must not have to re-derive any of these from raw lists itself.

## 6. Data model (summary)

- **User** — id, name, email (unique), password_hash, timezone, is_admin,
  timestamps.
- **Category** — id, user_id, name, timestamps.
- **Transaction** — id, user_id, category_id, recipient/sender name,
  amount (signed, integer minor units), transaction_date, source
  (`manual`|`receipt_scan`), receipt_scan_id (nullable), created_at,
  deleted_at (soft delete). Immutable after creation.
- **Budget** — id, user_id, category_id (unique per user), max_spend,
  theme, timestamps. Spent/remaining computed, not stored.
- **Pot** — id, user_id, name, theme, target_amount, total_saved,
  timestamps.
- **RecurringBill** — id, user_id, title, category_id, amount, due_day,
  timestamps. Status computed, not stored.
- **ReceiptScan** — id, user_id, image_path, extracted_fields (JSON),
  status, created_transaction_id (nullable), timestamps.

All tables carry `user_id`; every non-admin query filters on the
authenticated user. "Current balance" is never a stored column — it's
`sum(transactions.amount) - sum(net pot movements)`, computed at read
time, so it can't drift from its inputs.

## 7. Non-functional requirements

- **Security**: Marshmallow validation on every input, parameterized
  queries only, JWT + ownership check on every non-admin route, no
  hard-coded secrets, no sensitive data logged. Maps to the
  `security-check` skill's CWE checklist (CWE-20, CWE-89, CWE-78, broken
  auth/access control, CWE-798).
- **Timestamps**: stored UTC, converted to the user's timezone on
  response.
- **Money**: integer minor units (cents) or `Decimal`, never float —
  budget/pot math must not accumulate rounding error.
- **Concurrency**: pot add/withdraw and any other read-modify-write money
  operation must be safe under concurrent requests from the same user
  (row locking or equivalent — not a read-then-write race).
- **Migrations**: every schema change ships with an Alembic migration, per
  `CLAUDE.md`.

## 8. Open questions

1. **Recurring bill → transaction linkage**: does a bill's status flip to
   `paid` automatically when a matching transaction is created (by name +
   amount + date window), or does the user link them explicitly? Affects
   whether §5.6's derived status needs a matching heuristic.
2. **"Due soon" threshold** for recurring bills (§5.6) — needs a concrete
   number of days; not specified by the designs.
