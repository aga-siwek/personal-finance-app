# QA Report — Navigation (2026-07-21)

Stage: App shell / responsive navigation. Manual-tester pass via Playwright
(Chromium). Session seeded (fake token + mocked `GET /users/me`) so the
protected shell renders without a backend.

**Devices covered:** phones 375 / 393, tablets 768 / 834, desktop 1024 /
1440 / 1920 — chosen to cover the three nav treatments and the `lg` (1024px)
sidebar/bottom-bar switch.

**Shots per device:** Overview (active Overview), `/transactions` (active
Transactions), plus (desktop only) the collapsed sidebar.

## Results

All 17 shots rendered correctly with **zero console errors**.

| Group | Devices | Result |
|---|---|---|
| Phone (375, 393) | bottom bar, **icons only**, active = cream tab + green icon + green top accent | PASS |
| Tablet (768, 834) | bottom bar, **icon + label**, active label/icon green | PASS |
| Desktop (1024, 1440, 1920) | left **sidebar**, wordmark + 5 items, active = cream pill + green icon; "Minimize Menu" collapses to an icon rail (verified) | PASS |

### Visual check vs. `docs/preview/`
- Mobile bottom nav (icons) matches `Mobile - Home.jpg`.
- Tablet bottom nav (icon + label, active green) matches
  `Tablet - Home.jpg` / `Tablet - Transactions.jpg`.
- Desktop sidebar (active pill, minimize toggle) matches
  `Desktop - Home.jpg`; collapsed rail behaves as expected and content
  reflows.

### Accessibility (manual checklist)
- Each nav is a `<nav aria-label="Primary">`; links are real `<a>` via
  `NavLink`; the active link exposes `aria-current="page"`; the collapse
  control is a `<button>` with `aria-pressed`; icons are `aria-hidden`.
  No issues found.

## Summary

- **Total shots:** 17 (7 viewports) — **0 failures**, **0 console errors**
- Mobile icons ✓ · Tablet labels ✓ · Desktop sidebar expanded + collapsed ✓
  · active-route highlighting ✓
- **Deferrals (not defects):** lucide icon stand-ins (FM nav SVGs not in
  repo); "finance" text wordmark; logout temporarily on the Overview
  placeholder (design has no dedicated home for it yet).
