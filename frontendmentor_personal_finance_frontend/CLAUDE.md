# Personal Finance App — Frontend

Monorepo with three packages:
- `backend/`: Flask REST API with PostgreSQL
- `frontend/` (this package): React SPA with TypeScript, consuming the
  backend REST API

See [PRD](./docs/PRD.md) for product requirements and
[docs/preview/](./docs/preview/) for the reference design (Frontend Mentor
"Personal Finance App" export — Mobile/Tablet/Desktop × every screen,
including hover and modal states). The build must match this design 1:1.

## General conventions
- Commit messages: "feat:", "fix:", "docs:", "test:" prefixes
- **Never commit or push without asking first** — even after a plan or a
  build stage is approved, that is not approval to commit. Always ask
  explicitly before running `git commit`. When the user does say yes, push
  to `origin/<branch>` together with the commit in the same step — don't
  leave it local-only unless told to hold off.
- Code style: Prettier + the project ESLint/Oxlint config
- Never commit `.env` files or secrets
- All code should be written in English (UI copy follows the design, which
  is English)
- Do not use TODO comments. Instead, output a clear and specific message to
  the console describing exactly what needs to be done
- Monetary values: render whatever the API returns (integer cents /
  Decimal) — never do money math in the frontend beyond formatting for
  display. The backend is the source of truth for balances, budget spent/
  remaining, and pot totals (see backend `CLAUDE.md` / PRD).

## Development workflow
- **Build component by component**, not the whole app at once — each
  component gets its own tests, then a commit (only when asked), before
  moving to the next.
- **Run `/manual-tester` after implementing any larger section** — a full
  component or a grouped multi-component stage — before reporting it done,
  not just an ad-hoc visual glance. Always present the report's Summary
  directly in the conversation (not only saved to
  `docs/qa-reports/`) so failures are visible immediately after a bigger
  rollout, mirroring the backend's `/security-check`-after-stages rule.
- **Build order** (dependency-driven, mobile-first): Auth (Login/Sign Up) →
  App shell & Navigation (responsive sidebar ↔ bottom-nav, protected
  routing) → Overview → Transactions → Budgets → Pots → Recurring Bills.
  Receipt Scanner and Admin are **not built on the frontend** — see
  "Non-goals" in the PRD.
- **Plan Mode first**: before starting each new component (not every small
  edit within it), go through Plan Mode to verify connections/dependencies
  with the rest of the system before writing code.
- **Never move from planning into actual code execution without the user's
  explicit, separate go-ahead.** Approving a plan is not blanket approval
  for everything that follows from it — if execution will span multiple
  stages/passes, check in before starting execution at all, don't chain
  straight from plan approval into open-ended implementation.
- **Mobile-first, always**: write the unprefixed (mobile) Tailwind classes
  first, then layer up with `sm:`/`md:`/`lg:` for tablet/desktop, matching
  the breakpoints visible in `docs/preview/` (Mobile → Tablet → Desktop
  layouts differ in nav pattern and grid density, not just spacing).
- **Model routing**:
  - **Opus** — Plan Mode reviews, and first-pass foundational work: Redux
    store setup, the auth slice/JWT handling, the responsive app-shell/
    navigation component everything else nests inside — mistakes here
    ripple through every later component.
  - **Sonnet** (default) — the rest of implementation work once a
    component's foundation exists, plus code review.
  - **Haiku** — small copy/lint fixes and trivial cleanup, not layout or
    state logic.

## Stack

- **Build tool**: Vite
- **Framework**: React 19 + TypeScript
- **Routing**: `react-router` — public routes `/login`, `/signup`;
  protected routes `/`, `/transactions`, `/budgets`, `/pots`,
  `/recurring-bills` nested under an authenticated app-shell layout
- **State management**: Redux Toolkit + `react-redux`. One slice per
  domain, modeled on this author's `frontendmentor-mood-track-frontend`
  project's pattern:
  - `createSlice` + `createAsyncThunk` per async operation (never fetch data
    in a component `useEffect` — dispatch a thunk from the slice instead)
  - Typed hooks: `useAppSelector` / `useAppDispatch` (see that project's
    `src/store/store.ts` for the exact pattern to replicate)
  - `axios` for HTTP calls, JWT attached via an `Authorization: Bearer`
    header (token in-memory + `localStorage`, mirroring the mood-track
    auth slice)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) for layout, spacing,
  typography, and one-off utility styling.
- **Component library**: **shadcn/ui is required for interactive
  primitives** — modal/dialog, dropdown, select, tabs, toast, popover, and
  anything else with built-in keyboard/focus/ARIA behavior. Don't hand-roll
  these from scratch; install via the shadcn CLI. `components.json`
  convention (match `frontendmentor-mood-track-frontend`): style
  `new-york`, base color `neutral`, icon library `lucide-react`, CSS
  variables on, aliases `@/components`, `@/lib`, `@/hooks`.
- **Forms**: `react-hook-form` + `zod` + `@hookform/resolvers` for every
  form (login, signup, add/edit budget, add/edit pot, add/withdraw money).
- **Toasts/feedback**: `sonner`.
- **HTTP**: `axios`.

Rule of thumb: Tailwind decides *how something is laid out and spaced*;
shadcn decides *how an interactive widget behaves*. Don't rebuild dialog
focus-trapping or dropdown keyboard nav by hand when shadcn already ships
it accessibly.

## Accessibility

WCAG 2.1 AA is a build requirement, not a follow-up pass — apply this while
building each component, not after:

- Semantic HTML landmarks (`<nav>`, `<main>`, `<header>`) and heading
  hierarchy; don't build interactive elements out of `<div>`/`<span>` when
  a native element (`<button>`, `<a>`, `<input>`) does the job.
- Every interactive element is keyboard-operable with a visible focus
  state (don't strip `:focus` outlines without an equivalent replacement).
- Every form field has an associated `<label>` — placeholder text is never
  a substitute for a label.
- Color is never the only signal: category/theme color dots always pair
  with text (category name), income/expense amounts always pair with a
  sign (`+`/`-`), not just green/black color.
- Modals (shadcn `Dialog`) trap focus while open and restore focus to the
  trigger element on close — this comes for free from shadcn/Radix, don't
  bypass it with a custom implementation.
- Icons that are purely decorative get `aria-hidden="true"`; icons that
  convey meaning (e.g. a bare delete icon button) get an accessible name.
- Maintain sufficient contrast against both the cream page background and
  the dark navy surfaces used for the balance card, buttons, and nav.
- Verified in practice by the `/manual-tester` skill's accessibility pass
  (below), not just by eye.

## Testing device matrix

Used by the `/manual-tester` skill and as a manual sanity check when
building any responsive component. Mobile-first means: build for the
smallest phone first, then confirm nothing breaks going up this list.

**Phones (15, Apple-weighted, since this project's target audience skews
iOS — verify/refresh this list periodically as device popularity shifts):**

| Device | CSS viewport |
|---|---|
| iPhone SE | 375×667 (smallest-screen floor) |
| iPhone 16 / 15 | 393×852 |
| iPhone 16 Plus / 15 Pro Max | 430×932 |
| iPhone Air | 420×912 |
| iPhone 17 / 17 Pro | 402×874 |
| iPhone 17 Pro Max | 440×956 |
| Samsung Galaxy A16 5G (best-selling Android) | 360×800 |
| Samsung Galaxy S-series flagship | 412×915 |
| Google Pixel-class | 393×852 |
| Generic small Android | 360×640 |
| Generic mid Android | 384×854 |
| Generic large Android (phablet) | 412×892 |
| iPhone 14/13 (legacy, still common) | 390×844 |
| iPhone 12/13 mini | 375×812 |
| Xiaomi/Redmi common size | 393×873 |

**Tablets / iPads:**

| Device | CSS viewport |
|---|---|
| iPad mini | 744×1133 |
| iPad (10th/11th gen) | 820×1180 |
| iPad Air 13" | 834×1210 |
| iPad Pro 11" | 834×1194 |
| iPad Pro 12.9"/13" | 1024×1366 |
| Generic Android tablet | 800×1280 |

**Desktop:**

| Profile | Resolution |
|---|---|
| Common laptop | 1366×768 |
| MacBook Air | 1440×900 / 1512×982 |
| MacBook Pro 16" (scaled) | 1728×1117 |
| Most common desktop | 1920×1080 |
| QHD | 2560×1440 |

## Project structure

```
frontendmentor_personal_finance_frontend/
├── src/
│   ├── app/                    # store.ts, typed hooks, router config
│   ├── features/
│   │   ├── auth/                # Login, SignUp, authSlice
│   │   ├── overview/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── pots/
│   │   └── recurring-bills/
│   ├── components/
│   │   ├── ui/                  # shadcn primitives (generated, don't hand-edit structure)
│   │   └── layout/               # Sidebar, BottomNav, AppShell
│   ├── lib/                     # axios instance, formatters, utils
│   └── types/                   # shared API/domain types
├── docs/
│   ├── PRD.md
│   └── preview/                 # reference design export — source of truth for visuals
├── .claude/
│   └── skills/
│       ├── explain/
│       └── manual-tester/
├── index.html
├── package.json
└── vite.config.ts
```

This structure doesn't exist yet — it's created incrementally as each
component in the build order lands, not scaffolded all at once.

## Common tasks
- Run dev server: `npm run dev`
- Lint: `npm run lint`
- Explain a concept or piece of code: use the `/explain` skill
  (junior/mid-level, in Polish)
- QA pass across the device matrix (screenshots + report, no fixes): use
  the `/manual-tester` skill
- Security review of frontend code (XSS, unsafe `dangerouslySetInnerHTML`,
  token storage, dependency hygiene): use the generic `/security-review`
  skill — this project's stack-specific `/security-check` skill lives in
  the backend package and is scoped there
- Add a new screen/domain: create `src/features/<domain>/`, add a slice to
  `src/app/store.ts`, add the route, build mobile-first, then verify with
  `/manual-tester`

## Non-goals (v1, frontend)

- **Receipt scanner** — the backend documents this as an addition beyond
  the base Frontend Mentor challenge; no screen exists for it in
  `docs/preview/`, so it is not built on the frontend for v1.
- **Admin UI** — the backend exposes a full `/admin/*` API, but v1 frontend
  only builds the regular user experience shown in the design. Admin stays
  backend-only for now (confirmed with the user).
- Multi-currency, bank/card linking, multi-user/shared accounts — same
  non-goals as the backend PRD, since there's nothing for the frontend to
  render for these.
