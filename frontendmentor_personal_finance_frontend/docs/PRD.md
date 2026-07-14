# Personal Finance App — Frontend PRD

Status: Draft v1
Scope: `frontend/` only (React SPA). Data/business-rule guarantees live in
the backend PRD — this document defines what the UI must render, how it
behaves responsively, and what it must never compute itself. Feature
reference: [Frontend Mentor — Personal Finance App](https://www.frontendmentor.io/challenges/personal-finance-app-JfjtZgyMt1).
Design reference: `docs/preview/` (the official Frontend Mentor design
export — Mobile/Tablet/Desktop × Login/Sign Up/Overview/Transactions/
Budgets/Pots/Recurring Bills, including hover and modal states), reviewed
directly against this document.

## 1. Purpose

Provide a responsive, accessible SPA that lets an authenticated user view
and manage their transactions, category budgets, savings pots, and
recurring bills — matching the reviewed design 1:1 across mobile, tablet,
and desktop. The frontend is a pure consumer of the backend REST API: it
never computes balances, budget spent/remaining, or pot totals itself — it
renders what the API returns and sends user actions back to it.

## 2. Goals

- Every screen matches `docs/preview/` at the breakpoint it was designed
  for — layout, spacing, color, and interaction states (hover, active,
  modal-open).
- The app is usable and correct on the full device matrix in `CLAUDE.md`
  (`Testing device matrix`), not just at one or two arbitrary widths.
- The app is keyboard-operable and screen-reader-friendly end to end (WCAG
  2.1 AA baseline — see `CLAUDE.md` → "Accessibility").
- All money figures displayed come directly from the API response
  (formatted for display only); the frontend never derives balance, spent/
  remaining, or pot totals from raw transaction lists.
- State is predictable and inspectable: one Redux slice per domain, no data
  fetching hidden in component `useEffect`s.

## 3. Non-goals (v1)

- **Receipt scanner** — backend-documented as an addition beyond the base
  challenge; no design exists for it in `docs/preview/`. Not built on the
  frontend.
- **Admin UI** — the backend exposes `/admin/*`, but v1 frontend only
  builds the regular user experience. Confirmed out of scope with the
  user; admin stays backend-only.
- Multi-currency, bank/card account linking, multi-user/shared accounts —
  mirrors the backend PRD's non-goals; nothing in the design requires
  these.
- Editing a transaction after creation — matches the backend's immutable-
  transaction rule; the UI only offers create, view, and delete.

## 4. Roles

- **User** — the only role the frontend serves. Full CRUD on their own
  transactions (create/delete only, no edit — immutable per backend rule),
  categories (via budget creation), budgets, pots, and recurring bills, all
  scoped to their own JWT-authenticated session.

## 5. Navigation & responsive behavior

One app shell wraps every authenticated screen. The nav pattern is driven
by Tailwind breakpoints, not JS device/user-agent detection:

- **Desktop & tablet**: a dark, collapsible left sidebar (wordmark
  "finance" + Overview/Transactions/Budgets/Pots/Recurring Bills + a
  "Minimize Menu" toggle at the bottom). Collapsing swaps labelled nav
  items for icon-only.
- **Mobile**: the sidebar collapses into a fixed bottom icon bar (five
  icons: Overview/Transactions/Budgets/Pots/Recurring Bills), matching
  `docs/preview/Mobile - Home.jpg`.
- Unauthenticated routes (`/login`, `/signup`) render outside the app
  shell, full-bleed, with the dark illustrated panel shown on tablet/
  desktop (`Desktop - Login - Bonus.png`) collapsing to just the form on
  mobile (`Mobile - Login - Bonus.png`).

## 6. Screens

### 6.1 Login (`/login`)
- Email + password fields (password has a show/hide toggle), "Login"
  submit button, "Need to create an account? Sign Up" link.
- On submit: dispatch an auth thunk; on success, store the JWT and
  redirect to `/`; on failure, show an inline/toast error — never a silent
  failure.
- Reference: `Mobile/Tablet/Desktop - Login - Bonus.png`.

### 6.2 Sign Up (`/signup`)
- Name, email, password fields; password has a show/hide toggle and an
  inline hint ("Passwords must be at least 8 characters") matching the
  backend's min-length rule.
- On submit: dispatch a register thunk; on success, either log the user in
  directly or route to `/login` per whatever the backend's signup response
  actually returns (confirm when building this screen).
- Reference: `Mobile/Tablet/Desktop - Sign Up - Bonus.png`.

### 6.3 Overview (`/`)
- Current Balance (dark card), Income, Expenses — three summary cards.
- Pots summary card: total saved + up to 4 individual pot totals with
  theme-color indicators, "See Details" → `/pots`.
- Transactions summary: latest 5 transactions (avatar, name, amount signed
  +/-, date), "View All" → `/transactions`.
- Budgets summary: donut chart (spent vs. limit) + per-category legend,
  "See Details" → `/budgets`.
- Recurring Bills summary: Paid / Total Upcoming / Due Soon totals, "See
  Details" → `/recurring-bills`.
- All figures come from a single overview fetch on mount (one thunk), not
  four separate list fetches re-aggregated client-side — matches the
  backend's single-round-trip overview endpoint.
- Reference: `Mobile/Tablet/Desktop - Home.jpg`.

### 6.4 Transactions (`/transactions`)
- Search input (by recipient/sender name), sort dropdown (Latest, Oldest,
  A–Z, Z–A, Highest, Lowest), category filter dropdown ("All Transactions"
  + each category).
- List (mobile: stacked cards; desktop/tablet: table with Recipient/
  Sender, Category, Transaction Date, Amount columns).
- Pagination (numbered pages + Prev/Next), matching
  `Desktop - Transactions.jpg`'s 5-page control — confirm the API's page
  size when wiring this up (open question, §9).
- Reference: `Mobile/Tablet/Desktop - Transactions.jpg`, plus
  `- Active Category.png` / `- Active Sort.png` for open-dropdown states.

### 6.5 Budgets (`/budgets`)
- "+ Add New Budget" button opens a modal (category select, maximum spend
  input, theme/color select) — one budget per category, matches the
  backend's uniqueness rule; the category dropdown should exclude
  categories that already have a budget.
- Donut chart (total spent of total limit) + spending-summary legend.
- One card per budget: category name + color dot, maximum, progress bar,
  Spent/Remaining figures, "Latest Spending" (3 most recent transactions
  in that category, "See All" link), overflow menu (`...`) for Edit/
  Delete.
- Edit modal reuses the Add modal's fields pre-filled; Delete shows a
  confirmation modal before calling the delete thunk.
- Reference: `Mobile/Tablet/Desktop - Budget*.png/.jpg` (Add New, Edit
  Budget, Delete, and their hover states).

### 6.6 Pots (`/pots`)
- "+ Add New Pot" button opens a modal (name, target amount, theme/color
  select).
- Grid of pot cards: name + color dot, Total Saved, progress bar with
  percentage of target, "+ Add Money" / "Withdraw" buttons, overflow menu
  for Edit/Delete.
- Add Money / Withdraw modals show a live preview of the new pot total and
  new percentage as the user types the amount, before confirming — matches
  `Desktop - Pots - Add Money.png`'s "New Amount" + progress-bar preview.
  These map to the backend's atomic add/withdraw endpoints; the frontend
  sends one amount and lets the backend do the balance/pot math — it does
  not compute the resulting balance itself beyond the optimistic UI
  preview in the modal.
- Reference: `Mobile/Tablet/Desktop - Pots*.png/.jpg`.

### 6.7 Recurring Bills (`/recurring-bills`)
- Summary card: Total bills.
- Summary rows: Paid Bills, Total Upcoming, Due Soon (each with count +
  amount).
- Search input (by title).
- List: icon, title, "Monthly - <day>", a status indicator (paid = check,
  due-soon = warning, matching the backend's derived `paid`/`upcoming`/
  `due_soon` status), amount (due-soon amounts rendered in the warning
  color).
- Reference: `Mobile/Tablet/Desktop - Recurring Bills*.png/.jpg`.

## 7. State & data flow

- One Redux Toolkit slice per domain: `auth`, `overview`, `transactions`,
  `budgets`, `pots`, `recurringBills`, plus a `ui` slice for
  cross-cutting UI state (sidebar collapsed/expanded, active modal).
- One `createAsyncThunk` per backend endpoint a screen actually needs —
  no speculative thunks for endpoints nothing calls yet.
- JWT stored on login, attached to every authenticated request via an
  axios instance's `Authorization` header; a 401 response clears the
  session and redirects to `/login`.
- Mutating actions (create transaction, add/withdraw pot money, add/edit/
  delete budget, add/edit/delete pot) re-fetch or locally patch the
  affected slice(s) so the Overview and the detail screen stay consistent
  without a full page reload.

## 8. Non-functional requirements

- **Accessibility**: WCAG 2.1 AA — see `CLAUDE.md` → "Accessibility" for
  the concrete checklist; verified per-screen by the `/manual-tester`
  skill.
- **Responsiveness**: every screen verified against the device matrix in
  `CLAUDE.md` → "Testing device matrix", not just resized-browser spot
  checks.
- **Money display**: values are rendered from the API's integer-cents/
  Decimal response, formatted client-side (currency symbol, thousands
  separator, sign) — never recalculated from raw transaction sums.
- **No silent failures**: every thunk's `rejected` case surfaces an
  error to the user (inline field error or toast), never a console-only
  failure.

## 9. Open questions

1. **Exact color hex values and font family** — derived from visual review
   of `docs/preview/`; should be confirmed against a style-guide asset if
   one becomes available (not blocking — implementation starts from the
   observed palette in `CLAUDE.md`).
2. **Transactions pagination page size** — the design shows 5 numbered
   pages for the sample dataset; confirm the backend's actual page size/
   query params when building `/transactions`.
3. **Sign-up → post-registration flow** — whether the backend logs the user
   in immediately on signup or requires a separate login step; confirm
   against the backend's `/auth/signup` response when building §6.2.
