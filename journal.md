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

## 2026-07-16T06:32Z — run 2026-07-16-0632
- Task: no-op
- Did: Nothing. PR #9 (issue #4 price history chart) is open and complete, waiting
  for merge. Issues #5 (CI workflow) and #6 (GitHub Pages) both carry `needs-human`
  and have draft/blocked PRs. No actionable `claude-ready` issue exists.
- Decisions: none
- Noticed for later: Once a human unblocks #5 or #6 or merges #9, the next run will
  have work. If #5 stays blocked, new feature PRs will never get automated checks.

## 2026-07-16T00:00Z — PM run
- Triage: none — no unlabeled or needs-human open issues
- Created: #17 Data freshness badge: show last-updated timestamp in page header
- Rationale: Queue had 4 open claude-ready issues (#13–#16); room for one more before the cap of 5. Issue #17 directly addresses M1's "Trustworthy data" goal — diff files already carry `at` timestamps, the developer just needs to surface the most recent one in the page header. Sized well under 500 lines.

## 2026-07-16T10:24Z — run 2026-07-16-1021
- Task: #18 GitHub page is blank
- Did: Fixed blank GitHub Pages deploy by (1) adding `base: process.env.GITHUB_PAGES === 'true' ? '/azure-pricing-radar/' : '/'` to `vite.config.ts` — the deployment workflow already sets GITHUB_PAGES=true, so built assets now reference `/azure-pricing-radar/assets/…` instead of `/assets/…`; (2) switched hardcoded `/data/…` fetch paths in `loadDiffs.ts` and `loadHistory.ts` to `${import.meta.env.BASE_URL}data/…` so data fetches resolve correctly under the subdirectory path; (3) added `src/vite-env.d.ts` with `/// <reference types="vite/client" />` to expose `import.meta.env` to TypeScript. All 39 tests pass; lint, typecheck, and build green.
- Decisions: Tests mock fetch with `/data/…` URLs and still pass because Vitest resolves BASE_URL to `/` (no GITHUB_PAGES env set during test runs). Added `vite-env.d.ts` rather than modifying tsconfig to follow standard Vite convention.
- Noticed for later: The large chunk warning (Recharts >500 kB) is pre-existing and not in scope.

## 2026-07-16T14:32Z — run 2026-07-16-1425
- Task: #13 align existing charts with chart-design skill
- Did: Created `app/src/lib/format.ts` with shared `formatPrice`, `formatDateAxis`, `formatDateFull`, and `directionColor` helpers (skill requires a single shared formatter, never inline). Updated `PriceHistoryChart` to: (1) use direction-based line color (`drop=#34D399`, `increase=#F87171`, `new=#FBBF24`); (2) replace dots-on-all-points with `dot={false}` and `activeDot` only; (3) swap text "Loading…" for a skeleton block of chart height; (4) replace raw error message with plain-language copy; (5) add custom tooltip with date → SKU · scope → price → change-vs-previous (JetBrains Mono, dark `#111A2E` card, 8px radius); (6) format X-axis dates as "12 Jul"/"Jul 2026" with adaptive range; (7) use `formatPrice` for Y-axis ticks; (8) make chart height responsive (280px desktop, 200px mobile via CSS). Added `format.test.ts` with 14 unit tests; updated `PriceHistoryChart.test.tsx`. All 54 tests green; lint, typecheck, build all pass.
- Decisions: Used `ReadonlyArray<{ value?: unknown }>` for Recharts tooltip payload (typed readonly with `ValueType | undefined`); narrowed with `typeof raw !== 'number'` guard. No animation on skeleton — ADR 0002 caps animation at 150 ms, which is too short for a useful shimmer.
- Noticed for later: The chart has only one series (single SKU history), so area-fill-at-12%-opacity would be a valid future enhancement per the skill spec.

## 2026-07-16T17:47Z — run 2026-07-16-1742
- Task: #14 Mobile-responsive card layout for price-changes table
- Did: Added a `<ul class="pct__cards">` alongside the existing `<table>` in `PriceChangesTable`. Each `<li>` card shows direction badge, SKU name, product/region, and before→after price with unit. CSS media query at `max-width: 640px` hides the table and shows the card list; above 640px the cards are `display:none`. Cards have `min-height: 44px` for touch targets and inherit the same clickable/focus styles as table rows. Updated `App.test.tsx` and `PriceChangesTable.test.tsx` to use `getAllByText(...)[0]` where duplicate text now appears in both layouts, and scoped click-interaction tests to `.pct__row--clickable`. Added 11 new card-specific tests covering render, badge, meta, prices, clickability, keyboard interaction, and direction classes. 64 tests green; lint, typecheck, build all pass.
- Decisions: Dual-render (table + card list, CSS toggles visibility) rather than CSS `display:block` table reflow — gives cleaner semantic markup for each layout and a testable card render path. No JS media query hook needed; pure CSS handles the switch.
- Noticed for later: `PriceChangesTable` still has a local `formatPrice` that duplicates `lib/format.ts`; opening a separate issue for that cleanup.

## 2026-07-16T21:19Z — run 2026-07-16-2116
- Task: #15 Add percentage-change column to price-changes table
- Did: Added `formatPctChange(priceBefore, priceAfter, direction)` to `lib/format.ts` — returns signed percentage string (e.g. "-10.0%", "+11.1%") for drop/increase directions, "—" for new/removed or null priceBefore. Added "%" column header and percentage cell to the table (right-aligned, monospace, colored via `.pct__pct--drop` / `.pct__pct--increase` CSS classes using ADR 0002 tokens). Added the same percentage span to the mobile card's price section. Added 8 unit tests for `formatPctChange` and updated existing table tests to assert on the new column header and percentage values. 73 tests green; lint, typecheck, build all pass.
- Decisions: Added the percentage to both the desktop table and the mobile card for consistency — the "mobile card layout is out of scope" note in the issue referred to issue #14's structural work, which was already merged; omitting the % from cards would leave mobile users without the data.
- Noticed for later: nothing new.

## 2026-07-17T03:44Z — run 2026-07-17-0338
- Task: #16 Loading skeleton and empty-state polish
- Did: Added `loading` and `error` props to `PriceChangesTable`. When loading: renders a skeleton table with the same 8-column header structure and 6 `aria-hidden` skeleton rows (muted `rgba(147,164,190,0.1)` blocks), plus matching skeleton cards for the mobile layout — column widths are stable because the header always renders. When error: shows a warning SVG icon + "Failed to load price changes" headline + error detail. When empty: shows a table SVG icon + "No price changes detected" headline + "Check back after the next data fetch" subline. All states use existing ADR 0002 tokens only. Simplified `App.tsx` to always render `<PriceChangesTable loading error>`, removing the old `status-msg` paragraph pattern. Added 8 new tests covering skeleton count, skeleton headers, error state, and empty state; updated 3 existing App tests. 80 tests green; lint, typecheck, build all pass.
- Decisions: Placed all loading/empty/error rendering inside `PriceChangesTable` rather than `App.tsx` — single owner of the table area means no layout shift risk between states and the skeleton header directly seeds column widths. No skeleton animation (ADR 0002 caps animation at 150 ms; shimmer is explicitly out of scope per issue). Used inline SVG for state icons — no third-party library, no new dependencies.
- Noticed for later: `PriceChangesTable` still has a local `formatPrice` that duplicates `lib/format.ts` (noted in run 2026-07-16-1742; still not addressed).

## 2026-07-17T06:45Z — run 2026-07-17-0645
- Task: #17 Data freshness badge: show last-updated timestamp in page header
- Did: Changed `loadDiffs()` return type from `TableRow[]` to `{ rows: TableRow[]; lastUpdatedAt: string | null }`, extracting the most recent `at` timestamp across all fetched diff files. Added `formatLastUpdated(isoString)` to `lib/format.ts` — formats as "D MMM YYYY, HH:mm UTC" using UTC getters (locale-independent). Created `LastUpdatedBadge` component that renders "Last updated: <date>" or returns null when `lastUpdatedAt` is null, using only `--color-text-secondary` and `--text-xs` ADR 0002 tokens. Placed badge inside `.header` in `App.tsx` with `margin-left: auto` to right-align it. Added `LoadDiffsResult` interface to `types.ts`. Updated all affected tests; added 8 new tests (4 for `formatLastUpdated`, 3 for `LastUpdatedBadge`, 1 App integration). 90 tests green; lint, typecheck, build all pass.
- Decisions: Used UTC getters (`getUTCDate`, etc.) and a static month-name array rather than `toLocaleDateString` — guarantees consistent output across all environments regardless of locale settings. Placed badge in the header element (right-aligned) rather than below the title line — avoids wrapping on narrow viewports and follows the existing single-row header layout.
- Noticed for later: `PriceChangesTable` still has a local `formatPrice` that duplicates `lib/format.ts` (three runs noted; worth a dedicated cleanup issue).
