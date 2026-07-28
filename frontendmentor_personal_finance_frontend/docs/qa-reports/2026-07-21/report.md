# QA Report — 2026-07-21

Stage: Auth (Login + Sign Up). Manual-tester pass via Playwright (Chromium)
against the local dev server. No backend required — this pass covers
rendering, responsive layout, and console health of the two auth screens;
full submit/login/logout end-to-end will be re-checked once the backend is
running on `localhost:5000`.

**Devices covered:** representative slice of the CLAUDE.md device matrix,
chosen around the `lg` (1024px) breakpoint where the auth layout switches
from stacked (mobile bar + card) to side-by-side (illustration panel +
card):

- Phones: android-small 360×640, iPhone SE 375×667, iPhone 16/15 393×852,
  iPhone 17 Pro Max 440×956
- Tablets: generic 768×1024, iPad Pro 11" 834×1194, iPad Pro 13" 1024×1366
- Desktop: laptop 1366×768, MacBook Air 1440×900, FHD 1920×1080

**Screens covered:** Login (`/login`), Sign Up (`/signup`).

## Results

Every device × screen combination rendered correctly (heading present),
with **zero console errors/warnings** captured. Screenshots are under
`docs/qa-reports/2026-07-21/<device>/<screen>.png`.

| Group | Devices | Login | Sign Up | Console |
|---|---|---|---|---|
| Phone | 360, 375, 393, 440 | PASS | PASS | clean |
| Tablet | 768, 834, 1024 | PASS | PASS | clean |
| Desktop | 1366, 1440, 1920 | PASS | PASS | clean |

### Visual check vs. `docs/preview/`
- **Mobile (< lg):** dark "finance" bar with rounded bottom + white card,
  "Login"/"Sign Up" heading, Email/Password(/Name) labels, password
  show/hide eye toggle, dark full-width button, footer link, and the
  "Passwords must be at least 8 characters" hint on Sign Up — matches the
  mobile design.
- **Tablet (768, 834):** correctly shows the mobile stacked layout (the
  side panel only appears at `lg` = 1024) — expected, not a defect.
- **Desktop (≥ lg):** dark left panel (wordmark top, tagline bottom) +
  form card on the right — matches the design's structure.

### Accessibility (manual checklist — axe not run this pass)
- Labels associated with inputs (`htmlFor`/`id`); password toggle has an
  accessible name (`aria-label`) and `aria-pressed`; single semantic `h1`
  per screen; validation errors conveyed as text (`role="alert"`), not
  colour alone; focus rings from shadcn intact. No issues found.

## Summary

- **Total checks:** 20 (10 viewports × 2 screens)
- **Failures:** 0
- **Console errors:** 0
- **Accessibility violations (manual checklist):** 0

### Known deferrals (not defects — tracked in the plan)
1. Desktop dark panel has no illustration image yet (FM
   `illustration-authentication.svg` not in the repo). Wordmark + tagline
   render in its place.
2. The "finance" logo is a text wordmark stand-in (no logo SVG yet).
3. Automated a11y (axe-core) not run this pass; add
   `@axe-core/playwright` when QA covers interactive app screens.
4. Full submit → login → session → logout flow not exercised (needs the
   backend on `localhost:5000`).
