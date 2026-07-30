# QA Report — 2026-07-29

**Scope:** full app after building Overview, Transactions, Budgets, Pots and
Recurring Bills (build-order stages 3–7).

Devices covered: full matrix (15 phones, 6 tablets/iPads, 5 desktop = 26).
Screens covered: Overview, Transactions, Budgets, Pots, Recurring Bills
(authenticated) — Login/Sign Up were covered in the 2026-07-22 pass.

Method: Playwright walkthrough — one real UI login, then every authenticated
screen captured on each device (130 screen-checks). Per screen: console
errors, an automated a11y probe (single `<main>`, `<h1>` present, images
have `alt`, buttons have an accessible name, no horizontal body overflow),
and a full-page screenshot. Representative viewports were spot-compared to
`docs/preview/` (desktop + smallest phone + the lg boundary at 1024px).

## Automated results — 130 screen-checks

| Check | Result |
|---|---|
| Console errors | **0** |
| Horizontal body overflow (< any viewport) | **0** |
| Images missing `alt` | **0** |
| Buttons without an accessible name | **0** |
| Screens without exactly one `<main>` | **0** |

Every screen renders clean on every device, phone → QHD, with the shell
switching correctly (bottom nav < 1024px, sidebar ≥ 1024px including iPad
Pro 12.9" portrait).

## Visual comparison vs docs/preview/

- **Overview / Transactions / Budgets / Pots / Recurring Bills** match the
  reference layouts on desktop, tablet and mobile: card structure, donut,
  progress bars, tables↔cards responsive collapse, modals (Add/Edit/Delete,
  Add/Withdraw money), pagination, and status colours all line up.
- Known, intentional deviations (unchanged from plan): initials avatars
  instead of image avatars; Overview's Recurring Bills tile shows per-status
  counts (the `/overview` endpoint returns counts, not amounts); the budget
  legend orders by spent-ratio (backend sort). Recurring-bills status totals
  are summed client-side from the fetched list (no summary endpoint exists).

## Summary

- **Total checks:** 130 screen-checks across the full 26-device matrix.
- **Failures:** 0.
- **Accessibility violations (automated pass):** 0.

Full screenshots under `docs/qa-reports/2026-07-29/<device-slug>/`.
