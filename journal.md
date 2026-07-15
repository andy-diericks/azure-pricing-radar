# Development journal

Append-only diary of the autonomous developer. Each scheduled run adds one
entry (format in playbooks/dev-run.md). Humans read this to supervise;
Claude reads the tail of it to remember.

## 2026-07-15 — bootstrap
- Task: initial scaffold (created by the human, with Claude in claude.ai)
- Did: constitution (CLAUDE.md), playbook, workflows, data pipeline, ADRs,
  quality examples, issue templates.
- Decisions: Vite+React+TS, Recharts, GitHub Pages (ADR 0001); dark data-dense
  design system (ADR 0002); scoped fetch (VMs + Storage West Europe, OpenAI EU).
- Noticed for later: app/ does not exist yet — that's issue #1.

## 2026-07-15T18:43Z — run 2026-07-15-1836
- Task: #2 Scaffold the app/ dashboard (Vite+React+TS per ADR 0001)
- Did: Created app/ with Vite 5 + React 18 + TypeScript 5. Applied all ADR 0002
  tokens as CSS custom properties (colors, fonts, spacing, radius). Placeholder
  page shows site title, tagline, and a color-coded legend for price directions.
  Vitest + @testing-library/react included; 3 tests green. All 4 checks pass:
  lint, typecheck, test, build.
- Decisions: Used @testing-library/jest-dom/vitest entry point (not the default)
  so expect.extend() imports vitest's expect rather than a missing global.
  Created src/vitest.d.ts to make the jest-dom type augmentation available
  project-wide without polluting tsconfig types[].
- Noticed for later: Vite base path will need setting to /azure-pricing-radar/
  for GitHub Pages (issue #6 scope). Vitest 2.x deprecation warnings are harmless.

## 2026-07-15T19:47Z — run 2026-07-15-1938
- Task: #3 Load data/latest and render a price-changes table
- Did: Added PriceChangesTable component (pure, prop-driven) with ADR 0002 tokens.
  Created loadDiffs() that fetches /data/diffs/manifest.json then the per-scope diff
  files, converting added/removed/changed entries into typed TableRow objects sorted
  by priority (actual price moves first, new SKUs last, capped at 100 rows). Vite
  dev plugin serves ../data/ under /data/ and generates the manifest dynamically.
  19 tests green (8 component, 6 loader, 5 app); all 4 checks pass.
- Decisions: Used toFixed(6) with trailing-zero strip (min 2 decimals) for price
  display — locale-independent and consistent in jsdom test environment. Prioritised
  changed/removed rows over new-SKU rows since the first fetch has no history so
  "added" is artificially large.
- Noticed for later: Could not take a screenshot in the CI environment (no browser).
  The /data/ route only works in dev; build output needs data copied to app/public/
  for GitHub Pages (relates to issue #6).

## 2026-07-15T23:15Z — run 2026-07-15-2313
- Task: #5 CI workflow: lint, typecheck, test, build on PRs
- Did: Wrote .github/workflows/ci.yml (triggers on PR + push to main, runs lint /
  typecheck / test / build in app/ with Node 22 + npm cache). All four checks pass
  locally. Could NOT push: GitHub rejected the push with "refusing to allow a GitHub
  App to create or update workflow … without `workflows` permission". Labeled #5
  needs-human so the repo owner can grant the Claude GitHub App the `workflows` scope
  (in repo Settings → GitHub Apps or the App's permission settings).
- Decisions: Documented the blocker rather than abandoning the issue; the workflow
  file is correct and ready to merge once a human pushes or grants the permission.
- Noticed for later: This same missing permission will block any future issue that
  touches .github/workflows/. The workaround is to grant the `workflows` permission
  to the GitHub App in repository settings.
