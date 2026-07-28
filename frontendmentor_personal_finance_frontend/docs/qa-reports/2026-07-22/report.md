# QA Report — 2026-07-22

**Stage under test:** Etap 2 — App shell & Navigation (desktop Sidebar ≥lg,
mobile/tablet BottomNav, protected routing).

Devices covered: full matrix (15 phones, 6 tablets/iPads, 5 desktop = 26).
Screens covered: Login (public), Overview (authenticated shell). Nav
destinations (Transactions / Budgets / Pots / Recurring Bills) are
placeholders in this stage — their real screens land in later components,
so only shell + routing behavior is assessed here.

Method: Playwright walkthrough — real UI login once (auth flow exercised),
deep-link redirect check per device, responsive nav-pattern probe per
device, console-error capture per device, basic a11y checks (single `main`
landmark, nav links are real named `<a>`), plus a nav-walk (all 5
destinations, active-state check) on 3 representatives (iPhone SE / iPad
mini / MacBook Air) and a Sidebar minimize toggle test. Reference visuals
in `docs/preview/` were spot-compared on desktop + mobile representatives.

## Overview (authenticated shell)

### Responsive nav switch — all 26 devices: PASS
- Below `lg` (< 1024px): **BottomNav** renders (all 15 phones, 5 of 6
  tablets, incl. iPad Pro 11" 834px and Android tablet 800px).
- At/above `lg` (≥ 1024px): **Sidebar** renders — the 5 desktop profiles
  **and iPad Pro 12.9" portrait (1024px)**, which correctly crosses the
  breakpoint into the desktop sidebar.
- Every device's observed pattern matched the expected pattern for its
  width. No in-between "both/neither nav" state.

### Protected routing — all 26 devices: PASS
- Deep-linking `/budgets` while unauthenticated redirects to `/login` on
  every device.
- Real UI login (`qa.tester@example.com`) lands on `/` and renders the shell.

### Nav walk (iPhone SE, iPad mini, MacBook Air): PASS
- All 5 destinations reachable by clicking the *visible* nav; URL updates
  correctly for each.
- Active state: `aria-current="page"` is present on exactly the current
  destination and absent on the others (correct — no stale/duplicate
  active).

### Sidebar "Minimize Menu" (MacBook Air): PASS
- Toggle collapses the sidebar 300px → 88px (icon rail) and back, driven by
  the `ui` slice. Collapsed rail keeps the active pill and swaps to an
  expand chevron. Screenshot: `macbook-air/overview-sidebar-collapsed.png`.

### Console errors — all 26 devices: none.

### Accessibility (automated pass)
- Exactly one `<main>` landmark per page; `<nav>` landmarks labelled.
- All nav links are real `<a>` elements with an accessible name.
- The inactive breakpoint's nav is `display:none` (only 1 nav visible per
  device), so keyboard users don't get duplicate tab stops.
- Decorative nav icons carry `aria-hidden`.
- Note: this is an automated structural pass, not a full axe-core audit
  (axe not installed) — a keyboard/contrast deep-dive is still worth doing
  once real screens exist.

## Visual comparison vs docs/preview/

- **Shell structure matches** the reference on both breakpoints: dark
  full-height rounded sidebar with wordmark + active green-left-border /
  beige pill + "Minimize Menu"; dark rounded bottom bar with active
  green-top-accent / beige pill. Layout, colors, and active treatment line
  up with `Desktop - Home.jpg` / `Mobile - Home.jpg`.
- **Known deviation (not a stage failure): nav icons are lucide-react
  stand-ins**, not the Frontend Mentor original nav SVGs (documented in
  `navItems.ts`). Closest mismatches: Pots (piggy-bank vs jar/coin),
  Recurring Bills (receipt vs speech-bubble). Swap when the original assets
  are wired in.
- The Overview page **body** is an intentional placeholder ("Logged in
  as…"), so it does not match the real Overview design — expected, that
  screen is Etap 3.

## Summary

- **Total checks:** ~135 (26 devices × {redirect, nav-pattern, console,
  a11y} + 30 nav-walk assertions + minimize toggle).
- **Failures:** 0 functional.
- **Visual deviations:** 1 known/intentional — placeholder lucide nav icons
  vs original Frontend Mentor SVGs (minor polish, tracked in code).
- **Accessibility violations:** 0 found in the automated structural pass.

Full screenshots per device under
`docs/qa-reports/2026-07-22/<device-slug>/`.
