---
name: manual-tester
description: Manual QA pass over the running app — walk every screen across the project's device matrix (15 phones, tablets/iPads, desktop, Apple-weighted), screenshot each one, compare against the docs/preview/ reference design, check for console errors/broken interactions/accessibility issues, and produce a written report with its Summary always shown in the conversation. Report-only: never fixes what it finds. Use when the user asks for a QA pass, to test the app, to check responsiveness, invokes /manual-tester, or whenever a larger component/multi-component stage has just been implemented and is about to be reported done (standing rule, not just on-request — see CLAUDE.md's Development workflow section).
allowed-tools: Bash(npm run dev:*) Bash(npm install:*) Bash(npx playwright:*) Bash(npx tsx:*)
---

# Manual Tester

| Field | Value |
|---|---|
| **Name** | `manual-tester` |
| **Description** | Playwright-driven manual QA pass across this project's device matrix — screenshots every screen at every breakpoint, diffs behavior/layout against `docs/preview/`, checks console errors and basic accessibility, and reports findings in a fixed format. Never applies fixes. |

This complements automated tests (unit/component tests written per
`CLAUDE.md`'s "each component gets its own tests" rule) with an actual
walkthrough of the rendered app, the way a human QA tester would — but
systematically, across every device size the project cares about, not just
whatever window size the browser happens to be at.

## 1. Scope and boundaries

- **Standing trigger, not just on-request.** Run this skill after
  implementing any larger section — a full component, or a grouped
  multi-component stage — before reporting it done, the same way
  `/security-check` is a standing post-stage rule on the backend. Don't
  wait for the user to ask for a QA pass after a bigger rollout.
- **Report only — never fix.** This skill observes and documents; fixing
  what it finds is a normal follow-up implementation task (own Plan Mode
  check-in, own commit). Don't blur the two even if a fix looks trivial.
  This is stricter than `/security-check`, which reports *and* offers to
  fix — this skill only reports.
- Runs against the local dev server (`npm run dev`), never against a
  production/deployed URL unless the user explicitly asks for that.
- Covers whatever screens exist in the app *right now* — if only Login is
  built, the QA pass only covers Login. Don't invent coverage for
  unbuilt screens.

## 2. Setup (first run in this repo)

Playwright is not a dependency until this skill is first exercised. On
first use, check `package.json` for `@playwright/test`; if missing, ask the
user before adding it as a devDependency and running the browser install —
this is a dependency addition, not a doc change, so it follows the same
"ask before installing" posture as any other new package (per the
dependency-hygiene standing rule referenced from `/security-check`: verify
the package exists, prefer the latest stable release, don't invent a
version).

## 3. Device matrix

Use the exact matrix from `CLAUDE.md` → "Testing device matrix" (15 phones
weighted toward Apple devices, 6 tablets/iPads, 5 desktop profiles). Don't
invent a different set — that table is the shared source of truth so QA
results are comparable run to run. If the matrix in `CLAUDE.md` has been
updated since this skill was last used, use the current version.

For a quick/targeted QA pass (e.g. "just check the new Pots modal on
mobile"), it's fine to run a subset the user specifies — but say
explicitly which devices were covered and which were skipped, so partial
coverage is never mistaken for a full pass.

## 4. Walkthrough procedure

For each screen that currently exists in the app, for each device in scope:

1. Emulate the device's CSS viewport (Playwright `page.setViewportSize` +
   appropriate `deviceScaleFactor`/`isMobile`/`hasTouch` for phones/
   tablets).
2. Navigate to the screen (through the actual UI flow where relevant — e.g.
   log in through the Login form rather than only deep-linking, at least
   once per session, so the auth flow itself gets covered).
3. Capture:
   - A full-page screenshot →
     `docs/qa-reports/<YYYY-MM-DD>/<device-slug>/<screen-slug>.png`.
   - Browser console errors/warnings encountered on that screen.
   - Any interaction the screen defines (open a modal, submit a form with
     invalid data, sort/filter a list, add money to a pot) — note whether
     it behaved as designed.
4. Compare the screenshot against the matching `docs/preview/` reference
   image for that breakpoint/screen (e.g. `Mobile - Budget.jpg` for the
   Budgets screen on a phone-width viewport) — note visual mismatches
   (spacing, color, missing states, broken responsive collapse between
   sidebar/bottom-nav).
5. Run a basic accessibility check on the page (axe-core via
   `@axe-core/playwright` if installed, otherwise a manual pass against
   `CLAUDE.md`'s accessibility checklist: keyboard reachability, focus
   visibility, label presence, contrast) and record violations.

## 5. Report format

Write `docs/qa-reports/<YYYY-MM-DD>/report.md`:

```
# QA Report — <date>

Devices covered: <list, or "full matrix">
Screens covered: <list>

## <Screen name>

### <Device name> (<viewport>)
- Status: PASS | FAIL | PARTIAL
- Screenshot: <relative path>
- Visual diff vs. docs/preview/<reference file>: <none | description>
- Console errors: <none | list>
- Interaction check: <what was exercised, result>
- Accessibility: <none found | list of violations with severity>

(repeat per device, per screen)

## Summary

- Total checks: N
- Failures: N (ranked most-severe first, with a one-line description each)
- Accessibility violations: N
```

Rank the Summary's failure list most-severe first (broken/unusable >
visual mismatch > minor polish). If a screen passes clean on every device,
say so explicitly rather than omitting it — a full-pass screen is useful
signal too.

## 6. After the report

**Always** present the Summary section directly in the conversation —
never leave it only saved to `docs/qa-reports/`, and never report a
component/stage "done" without having shown it. Include the total check
count, failure count (ranked most-severe first), and accessibility
violation count inline; mention the report path for full detail/
screenshots. Then stop — offer to start a fix as a separate,
explicitly-approved next step, per this project's standing rule that
execution never chains automatically off of a review.
