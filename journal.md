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

## 2026-07-17T00:00Z — PM run
- Triage: #21 ("align README and any UI copy with ADR 0003") rewritten — original body was a duplicate of the title with no Goal/DoD/Out-of-scope. Identified the concrete violation: `App.tsx` header subtitle reads "Real-time price change tracking", which ADR 0003 forbids. Rewrote with specific Goal, Definition of done, and Out-of-scope section.
- Created: #28 cleanup: deduplicate formatPrice in PriceChangesTable, #29 polish: add favicon and meta description to index.html, #30 perf: lazy-load PriceHistoryChart to cut initial JS bundle
- Rationale: M1 is finishing (2 existing issues in queue: #17 data freshness badge, #21 UI copy fix). All three new issues are M1-milestone polish — code quality (#28, journal-flagged twice), visual excellence + shareable moments (#29, vision goals 4 & 6), and performance (#30, vision goal 8: Lighthouse ≥ 90). Queue is now at the cap of 5; next PM run will hold unless issues close.

## 2026-07-17T12:00Z — PM run
- Triage: none — no unlabeled or needs-human open issues
- Created: none — queue full (5 open claude-ready issues: #17, #21, #28, #29, #30)
- Rationale: Previous PM run this morning already filled the queue to the cap of 5. No new issues created; holding until developer runs consume the backlog.
## 2026-07-17T06:45Z — run 2026-07-17-0645
- Task: #17 Data freshness badge: show last-updated timestamp in page header
- Did: Changed `loadDiffs()` return type from `TableRow[]` to `{ rows: TableRow[]; lastUpdatedAt: string | null }`, extracting the most recent `at` timestamp across all fetched diff files. Added `formatLastUpdated(isoString)` to `lib/format.ts` — formats as "D MMM YYYY, HH:mm UTC" using UTC getters (locale-independent). Created `LastUpdatedBadge` component that renders "Last updated: <date>" or returns null when `lastUpdatedAt` is null, using only `--color-text-secondary` and `--text-xs` ADR 0002 tokens. Placed badge inside `.header` in `App.tsx` with `margin-left: auto` to right-align it. Added `LoadDiffsResult` interface to `types.ts`. Updated all affected tests; added 8 new tests (4 for `formatLastUpdated`, 3 for `LastUpdatedBadge`, 1 App integration). 90 tests green; lint, typecheck, build all pass.
- Decisions: Used UTC getters (`getUTCDate`, etc.) and a static month-name array rather than `toLocaleDateString` — guarantees consistent output across all environments regardless of locale settings. Placed badge in the header element (right-aligned) rather than below the title line — avoids wrapping on narrow viewports and follows the existing single-row header layout.
- Noticed for later: `PriceChangesTable` still has a local `formatPrice` that duplicates `lib/format.ts` (three runs noted; worth a dedicated cleanup issue).

## 2026-07-17T14:08Z — run 2026-07-17-1403
- Task: #28 cleanup: deduplicate formatPrice — remove local copy in PriceChangesTable
- Did: Removed the local `formatPrice` function from `PriceChangesTable.tsx` (lines 12–17) and added `formatPrice` to the existing import from `../lib/format`. Updated the four call sites — the local function returned the number only (no `$`), so callers used `` `$${formatPrice(...)}` ``; the shared function already includes `$`, so those became `` `${formatPrice(...)}` ``. All test assertions were already written to expect `$`-prefixed values, so no test changes were needed. 90 tests green; lint, typecheck, build all pass.
- Decisions: No changes to the `formatPrice` implementation or to any other component — strictly within the issue scope.
## 2026-07-17T10:13Z — run 2026-07-17-1011
- Task: #21 align README and any UI copy with ADR 0003
- Did: Changed the `header__subtitle` span in `App.tsx` from "Real-time price change tracking" to "Price changes · checked every 6 hours", complying with ADR 0003's explicit ban on "real-time" or "live prices" in UI copy. Scanned all `*.tsx`/`*.ts` source files — no other violations found. All 90 tests pass; lint, typecheck, build green.
- Decisions: Used the copy suggested in the issue ("Price changes · checked every 6 hours") — it directly satisfies the ADR constraint, accurately conveys cadence, and requires no new CSS or layout changes.
- Noticed for later: nothing new.

## 2026-07-17T18:00Z — PM run
- Triage: none — no unlabeled or needs-human open issues
- Created: #35 accessibility: add ARIA labels and keyboard navigation to price-changes table, #36 docs: refresh README to document the M1 dashboard, #37 ux: click-to-sort column headers in price-changes table
- Rationale: Queue had 2 open claude-ready issues (#29, #30); room for 3 more before the cap of 10. M1 is finishing (core features deployed); all three issues round out M1 quality — accessibility serves keyboard/screen-reader users (vision goal 6), README refresh makes the project credible to new visitors (vision: "README is a product surface"), and column sorting directly addresses "what changed most?" (vision goal 2: instant answers). Queue is now at 5.

## 2026-07-17T17:31Z — run 2026-07-17-1731
- Task: #35 accessibility: add ARIA labels and keyboard navigation to price-changes table
- Did: Added `DIRECTION_SR_LABELS` constant mapping directions to plain-language strings ("price drop", "price increase", "new SKU", "removed SKU"). Added `rowAriaLabel` helper that builds the accessible summary label (e.g. "Standard_D2s_v5 · westeurope — price drop -10.0%"). In the table and card badge cells: added `aria-hidden="true"` to the visual badge span (hides Unicode symbols from screen readers) and a sibling `<span class="sr-only">` with the clean direction text. Clickable `<tr>` elements now carry `role="button"` and an `aria-label` set to `rowAriaLabel(row)` — replacing the generic "View price history for …" label. Mobile `<li>` cards receive identical `role` and `aria-label` when clickable. Focus rings were already present (`.pct__row--clickable:focus` and `.pct__card--clickable:focus`); no changes needed. Added `.sr-only` utility to `PriceChangesTable.css`. Added 12 new tests; 102 tests total; lint, typecheck, build all pass.
- Decisions: Put `.sr-only` in `PriceChangesTable.css` rather than `index.css` — only one component uses it today; can be promoted to global if needed. `rowAriaLabel` includes the signed percentage (e.g. "-10.0%") even though the issue example shows "10.0%" — the sign is accurate information and the direction word already redundantly conveys it.
- Noticed for later: nothing new.

## 2026-07-17T21:10Z — run 2026-07-17-2108
- Task: #36 docs: refresh README to document the M1 dashboard
- Did: Rewrote the "What it tracks today" section to reflect the actual data scopes (`vm-eu-west`, `storage-eu-west`, `openai-eu`). Added a new "Dashboard features" section documenting all M1 features: price-changes table (direction, %, SKU, region, before/after), per-SKU history chart, data-freshness badge, loading/error/empty states, and mobile card layout. Added a "Run locally" section with exact clone+install+dev commands. Removed stale info (old "How the data works" paragraph with outdated scope list). No app code changed; 102 tests pass; lint, typecheck, build all green.
- Decisions: Kept the OpenAI scope listed as "EU" to match the actual filename (`openai-eu.json`) rather than the outdated "West Europe, Sweden Central, France Central" wording. Preserved existing emoji and section order to minimize diff noise.
- Noticed for later: nothing new.

## 2026-07-18T03:34Z — run 2026-07-18-0332
- Task: #29 polish: add favicon and meta description to index.html
- Did: Added `app/public/favicon.svg` — a minimal radar icon (concentric circles + sweep line) using ADR 0002 tokens (`#0B1120` background, `#38BDF8` accent). Added `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` and a `<meta name="description">` tag (138 chars) to `app/index.html`. Vite copies `public/` assets to `dist/` automatically; confirmed `dist/favicon.svg` present after build. No tests added (static assets are not unit-tested per issue spec). 102 tests pass; lint, typecheck, build all green.
- Decisions: Used a radar-sweep icon (concentric circles + one angled line) to reinforce the "Pricing Radar" product name; legible at 16×16 browser-tab size due to single accent color on dark background. Kept meta description under 160 chars and plain-text only as required.
- Noticed for later: nothing new.

## 2026-07-18T00:00Z — PM run
- Triage: none — no unlabeled or needs-human open issues
- Created: #43 polish: add Open Graph and Twitter Card metadata to index.html, #44 polish: add gradient area fill to PriceHistoryChart, #45 accessibility: focus management when price-history chart panel opens and closes
- Rationale: Queue had 2 open claude-ready issues (#30 perf lazy-load, #37 sort columns); room for 3 before the cap of 5. All three are M1 polish — #43 addresses vision goal 4 (Shareable moments), #44 addresses vision goal 6 (Visual excellence, area-fill pattern flagged twice in the journal), and #45 completes the keyboard accessibility story from #35 (vision goal 6). Queue is now at 5.
## 2026-07-18T06:22Z — run 2026-07-18-0620
- Task: #30 perf: lazy-load PriceHistoryChart to cut initial JS bundle
- Did: Replaced the static `import { PriceHistoryChart }` in `App.tsx` with `React.lazy(() => import('./components/PriceHistoryChart').then(m => ({ default: m.PriceHistoryChart })))`. Wrapped the conditional chart render in `<Suspense fallback={<div className="phc__lazy-fallback" />}>` — the fallback is a fixed full-screen dim overlay (4 CSS lines, ADR 0002 `rgba(0,11,28,0.8)`) shown only during the one-time chunk download. Updated two App.test.tsx chart-interaction tests to `await waitFor(...)` before asserting chart presence, since the lazy import resolves asynchronously even in the mocked test environment. Build output: main bundle dropped from ~520 kB to **155 kB**; Recharts split into a separate `PriceHistoryChart-*.js` chunk (361 kB) with no chunk-size warning emitted. 102 tests green; lint, typecheck, build all pass.
- Decisions: Used `.then(m => ({ default: m.PriceHistoryChart }))` to wrap the named export as the default required by `React.lazy` — avoids adding a default export to the component file and keeps named-export convention consistent across the codebase. Fallback CSS placed in `App.css` (not `PriceHistoryChart.css`) because Suspense is an App-level concern.
- Noticed for later: The PriceHistoryChart async chunk is 361 kB (gzip: 107 kB) — Recharts is inherently large; no further splitting needed unless Recharts itself is replaced.

## 2026-07-18T09:52Z — run 2026-07-18-0951
- Task: #45 accessibility: focus management when price-history chart panel opens and closes
- Did: (1) Changed `onRowClick` prop in `PriceChangesTable` from `(row) => void` to `(row, element: HTMLElement) => void`, passing `e.currentTarget` for both click and keydown events. (2) In `App.tsx`, added `openerRef` to store the activating element; `handleRowClick` stores it, `handleChartClose` restores focus and clears the ref; added an App-level `document` Escape handler (runs when `selectedRow` is non-null) so the mock-based App tests can verify Escape behaviour without the real PriceHistoryChart. (3) In `PriceHistoryChart.tsx`, added `closeRef` and a mount-time `useEffect` that calls `closeRef.current?.focus()`, giving keyboard users immediate access to the close button. Updated 3 existing `PriceChangesTable.test.tsx` assertions (`toHaveBeenCalledWith(makeRow())` → `toHaveBeenCalledWith(makeRow(), expect.any(HTMLElement))`). Added 3 new tests: "focuses the close button on mount" (PriceHistoryChart.test.tsx), "returns focus to the activating row when the chart is closed", and "returns focus to the activating row when Escape is pressed" (App.test.tsx). 105 tests green; lint, typecheck, build all pass.
- Decisions: Kept the Escape handler in `PriceHistoryChart` (required by its existing test) and added a parallel App-level handler so App tests can simulate Escape without rendering the real chart. Double-call of `handleChartClose` on Escape is harmless: the second call sees `openerRef.current === null` and is a no-op. Moved `onClose` composition (focus restore + state clear) into `handleChartClose` rather than the chart itself — App owns the state and the opener, so it owns the restore logic.
- Noticed for later: nothing new.

## 2026-07-18T13:57Z — run 2026-07-18-1349
- Task: #37 ux: click-to-sort column headers in price-changes table
- Did: Added `SortKey` and `SortDir` types plus `sortRows()` (stable sort with direction tie-breaking) to `PriceChangesTable.tsx`. Default state: `pct/desc` (largest |pct| first, ties by direction priority). Extracted `SortableHeader` component that renders a sortable `<th>` with `tabIndex={0}`, `aria-sort`, and a `↑/↓` indicator inside an `aria-hidden` span (accessible name stays clean). Seven columns are sortable (`direction`, `sku`, `product`, `region`, `before`, `after`, `pct`); "Unit" is static. `before` column handles nulls-last for both sort directions. `handleSort` toggles direction when clicking the active column; resets to ascending for a new column. Added `.pct__th--sortable` / `.pct__th--active` / `.pct__sort-indicator` CSS classes using only ADR 0002 tokens. Added 16 new tests in a `sorting` describe block: default order, sort by each column, toggle asc/desc, keyboard Enter/Space, sort indicator text and aria-sort attribute, mobile card order. 121 tests green; lint, typecheck, build all pass.
- Decisions: Sorting is performed on the `rows` prop inside the component (not in the loader) so the 100-row cap from `loadDiffs` is preserved and the table remains self-contained. Used `useMemo` for the sorted list to avoid re-sorting on every render. `SortableHeader` is defined outside `PriceChangesTable` to prevent remounting on each parent render. Absolute |pct| is used for the `%` column sort — consistent with the default sort intent (largest moves first).
- Noticed for later: nothing new.

## 2026-07-18T21:08Z — run 2026-07-18-1
- Task: #44 polish: add gradient area fill to PriceHistoryChart
- Did: Replaced `LineChart` + `Line` with `AreaChart` + `Area` in `PriceHistoryChart.tsx`. Added `fill={color}` and `fillOpacity={0.12}` to `Area` — fill colour matches the direction-based stroke (`#34D399` drop / `#F87171` increase / `#FBBF24` new). All existing props (`dot={false}`, `activeDot`, `strokeWidth`, `isAnimationActive`) are preserved. Updated the Recharts mock in `PriceHistoryChart.test.tsx` to export `AreaChart`/`Area` (with data attributes for fill/stroke/fillOpacity) and renamed the `line-chart` testid to `area-chart`. Added one new test asserting that `fill === stroke` and `fillOpacity === 0.12`. 122 tests green; lint, typecheck, build all pass.
- Decisions: Used a flat translucent fill (no SVG gradient definition) as specified in the issue's out-of-scope section. No changes to `lib/format.ts`, tooltip config, or axis formatting — strictly within scope.
## 2026-07-18T17:15Z — run 2026-07-18-1714
- Task: #43 polish: add Open Graph and Twitter Card metadata to index.html
- Did: Added 9 meta tags to `app/index.html`: `og:title`, `og:description`, `og:type` ("website"), `og:url` (https://andy-diericks.github.io/azure-pricing-radar/), `og:image` (absolute URL pointing to the existing `favicon.svg`), `twitter:card` ("summary"), `twitter:title`, and `twitter:description`. All values match the existing `<title>` and `<meta name="description">`. No JS or new dependencies. 121 tests pass; lint, typecheck, build all green.
- Decisions: Used an absolute URL for `og:image` (required by the OG spec — relative paths are not resolved by crawlers). Ordered OG tags before Twitter Card tags following convention. `twitter:image` omitted — the issue scope only specifies `twitter:card`, `twitter:title`, and `twitter:description`.
- Noticed for later: nothing new.

## 2026-07-19T00:00Z — PM run
- Triage: #51 "Fix data freshness badge" — already labeled claude-ready/P1; DoD was vague ("check that the date showed is the current one"). Added investigation-guide comment distinguishing code bug (loadDiffs.ts reads wrong timestamp) from stale data pipeline (diff files genuinely old). No label changes needed.
- Created: #52 polish: add change-count summary above price-changes table, #53 accessibility: add skip-to-main-content link, #54 polish: PriceHistoryChart empty state when fewer than 2 history points
- Rationale: Queue had 1 open claude-ready issue (#51); room for 3 more before the cap of 5. M1 is "done/finishing" — all three issues round out M1 quality: #52 addresses vision goal 2 (instant answers) + goal 6 (visual excellence); #53 completes WCAG 2.4.1 compliance (goal 6); #54 fixes a misleading chart empty-area state (goal 1 trustworthy data + goal 6 polish). Queue is now at 4.

## 2026-07-19T12:00Z — PM run
- Triage: none — no unlabeled or needs-human issues
- Created: #57 E1.3a: Faceted filters (service, region, direction, magnitude)
- Rationale: Queue had 4 open claude-ready issues (#51–#54); room for 1 more before the cap of 5. E1.3 is the next epic sub-task: faceted filters (service, region, direction, magnitude slider) with URL encoding for shareable filtered views. Sized as E1.3a (client-side filtering on full dataset). E1.3b (reset button and UX refinement) deferred to a later run. Queue is now at the cap of 5; next PM run holds until developer runs consume work.

## 2026-07-19T10:10Z — run 2026-07-19-1
- Task: #51 Fix data freshness badge (P1)
- Did: Full investigation — no code bug found. Traced loadDiffs.ts → formatLastUpdated → LastUpdatedBadge: the badge correctly reads the `at` field from data/diffs/2026-07-15/*.json ("2026-07-15T17:41:10.201545+00:00") and displays "15 Jul 2026, 17:41 UTC". The microsecond-format ISO string is explicitly covered by format.test.ts:102. The fetch-prices pipeline has been running 4× a day (last run 2026-07-19T05:38Z) but no new diffs are written because Azure prices have not changed since July 15 — this is correct behavior.
- Decisions: Closed #51 as not a code bug. Opened #58 (needs-human) requesting that the pipeline write a data/last-checked.json on every run so the badge can distinguish "prices unchanged today" from "data stale" — requires scripts/ modification (frozen zone, human must apply).
- Noticed for later: nothing new.

## 2026-07-19T17:20Z — run 2026-07-19-2
- Task: #52 polish: add change-count summary above price-changes table
- Did: Created `ChangesSummary` component with `rows: TableRow[]` and `loading?: boolean` props. Renders direction counts (drops, increases, new SKUs, removed) colored by ADR 0002 tokens, with zero-count directions omitted and `·` separators. Loading state shows 3 inline skeleton blocks matching the table's pattern. Empty rows → null. Placed immediately above `<PriceChangesTable>` in `App.tsx`. Added 6 unit tests (empty rows, correct counts, omit-zero, singular labels, loading skeleton, CSS classes). Updated README "Dashboard features" to mention the summary bar. 135 tests green; lint, typecheck, build all pass.
- Decisions: Used CSS flexbox with `gap` for layout and `·` separators rendered as `aria-hidden` spans (screen readers read only the colored item text, not the punctuation). For the "removed" direction, used `--color-text-secondary` — no dedicated removal token in ADR 0002, matching the existing `pct__badge--removed` pattern. Loading skeleton renders even when `rows` is empty since the load state takes priority over the empty state.
- Noticed for later: nothing new.

## 2026-07-19T21:13Z — run 2026-07-19-3
- Task: #57 E1.3a: Faceted filters (service, region, direction, magnitude)
- Did: Added `lib/filters.ts` with `FilterState` interface, `parseFiltersFromSearch`, `filtersToSearch`, and `applyFilters` pure functions. Created `FilterPanel` component (service multi-select, region multi-select, direction toggles, magnitude slider) that derives available options from the loaded rows — service/region groups only render when 2+ unique values exist. Wired filter state to `App.tsx`: initialised from `window.location.search`, synced back via `history.replaceState` on every change, and applied via `useMemo` before passing to `ChangesSummary` and `PriceChangesTable`. Added 23 tests across `FilterPanel.test.tsx` (10) and `lib/filters.test.ts` (13) covering empty state, option discovery, toggle add/remove, URL round-trip, and filter application for each dimension including magnitude edge cases. 158 tests green; lint, typecheck, build all pass.
- Decisions: Extracted URL helpers into `lib/filters.ts` (not inlined in `App.tsx`) to make them independently unit-testable. Magnitude filter excludes `new`/`removed` rows — they have no % move to compare against. Service/region groups hidden when ≤1 unique value to avoid pointless single-item checkboxes. Slider uses `accent-color: var(--color-accent)` (on-token; native range input, no custom track markup needed).
- Noticed for later: nothing new.

## 2026-07-20T04:07Z — run 2026-07-20-1

- Task: #53 accessibility: add skip-to-main-content link
- Did: Added `<a href="#main-content" class="skip-link">Skip to main content</a>` as the first child of `.app` in `App.tsx`. Added `id="main-content"` to the existing `<main>` element. Added `.skip-link` CSS in `App.css`: visually hidden (clip/clip-path/1×1px) by default, fully visible on `:focus` using ADR 0002 tokens (`--color-bg-card` background, `--color-text-primary` text, `--color-accent` outline). Added 2 new tests: link exists with correct `href`; skip link is the first focusable element in the document. 160 tests green; lint, typecheck, build all pass.
- Decisions: Used `--color-bg-card` for the skip link background — the issue referenced `--color-surface` which does not exist as a token; `--color-bg-card` is the nearest equivalent. Both `clip` and `clip-path` set for broad browser compatibility; both are cleared on focus.
- Noticed for later: nothing new.

## 2026-07-20T07:35Z — run 2026-07-20-2
- Task: #54 polish: PriceHistoryChart empty state when fewer than 2 history points
- Did: Added `ChartEmptyIcon` (inline SVG: chart outline with a trend line) to `PriceHistoryChart.tsx`. Changed the chart-body conditions from `chartData.length === 0` / `chartData.length > 0` to `chartData.length < 2` / `chartData.length >= 2` — both 0-point and 1-point histories now show the empty state instead of a broken chart. Replaced the old `<p className="phc__status">` fallback with a `<div className="phc__empty">` containing the icon, "Not enough history yet" headline, and "Check back after the next data fetch" subline, matching the PriceChangesTable visual pattern (ADR 0002 tokens only). Added `.phc__empty`, `.phc__empty-icon`, `.phc__empty-headline`, `.phc__empty-subline` CSS classes to `PriceHistoryChart.css`. Updated `mockFetch` in the test to return 2 data points so existing chart-render tests continue to pass. Replaced the old empty-state test; added 2 new tests: empty history array and exactly 1 history point. 161 tests green; lint, typecheck, build all pass.
- Decisions: Used a chart-outline SVG icon (not the table icon from PriceChangesTable) to contextually signal the chart area. Applied the `chartData.length < 2` threshold to the filtered (non-null price) array, consistent with how the chart consumes the data.
- Noticed for later: nothing new.

## 2026-07-20T09:15Z — PM run
- Triage: none — no unlabeled or needs-human issues
- Created: none — queue full (32 open claude-ready issues)
- Rationale: Developer runs have been steady; current queue exceeds the cap of 5 by a large margin. Holding until multiple issues close. E1 is progressing well with faceted filters, accessibility, and polish features shipped. Next PM run will create issues only if queue drops below 5.

## 2026-07-20T12:00Z — PM run
- Triage: none — no unlabeled or needs-human open issues
- Created: #68 E1.4 Full-text SKU search with instant filtering (P2), #69 E1.5 Biggest movers hero strip (P2), #70 E2.1 design proposal for SKU routing/pre-render strategy (needs-human)
- Rationale: Queue empty (0 open claude-ready issues); all issues from previous runs have closed or merged. E1 is nearly complete—E1.3a (faceted filters) and E1.6 (accessibility/mobile/empty states) are shipped. Created E1.4 and E1.5 to finish the epic. E2.1 requires a human design decision per the product vision before implementation, so opened it as needs-human to unblock the next epic. Epic E1 completion will be journaled once E1.4 and E1.5 ship.

## 2026-07-20T14:00Z — run 2026-07-20-3
- Task: #68 E1.4: Full-text SKU search with instant filtering
- Did: Added `searchTerm: string` to `FilterState` in `lib/filters.ts`; updated `parseFiltersFromSearch` (reads `?search=`), `filtersToSearch` (emits `search` param when non-empty), and `applyFilters` (case-insensitive substring match on `skuName`). Created `SearchInput` component (controlled text input with search icon and a clear button, `type="search"` to suppress native browser clear), placed above `FilterPanel` in the card section. Search term and all facet filters are serialized together into the URL, so any combination of search + facets is shareable. Added `SearchInput.css` with ADR 0002 tokens only; full-width on `max-width: 640px`. Added `SearchInput.test.tsx` (5 tests), 6 new `applyFilters` tests (case sensitivity, empty term, AND logic with facets), 2 new `parseFiltersFromSearch` tests, 2 new `filtersToSearch` tests. Updated README "Dashboard features" section to describe search and facet filters. 173 tests green; lint, typecheck, build all pass.
- Decisions: Integrated `searchTerm` into the existing `FilterState` rather than separate state — one URL-sync path, one `applyFilters` call, and the AND combination with facets is automatic. Placed search input above FilterPanel (not in the page header) to keep the header row compact and avoid layout shift on mobile.
- Noticed for later: nothing new.

## 2026-07-20T09:32Z — PM run
- Triage: none — no unlabeled or needs-human open issues
- Created: none — 3 open claude-ready issues; queue sustainable
- Rationale: E1 progress is steady with #68 (search, just shipped) and #57 (#57 faceted filters), #69 (#69 biggest movers) all in flight. Queue holds 3 claude-ready issues, all E1-epic items at P2. High-priority P1 issues (#51 data freshness bug, #58 badge UX distinction) remain open but will be picked up next by developer runs. No new issues created; current backlog size is healthy.

## 2026-07-20T11:20Z — run 2026-07-20-4
- Task: #70 E2.1 design proposal: SKU Detail Pages routing and pre-render strategy (P1)
- Did: Counted unique skuName values across all diff files: 4,258 in vm-eu-west + 155 in storage-eu-west = 4,413 total. This exceeds the human-set threshold of 2,000. Per the decision comment on #70, stopped implementation and opened #73 (needs-human) proposing Option B (top-N pre-render + on-demand fallback) with specific questions: how many SKUs to pre-render, ranking signal (frequency vs recency), on-demand strategy (client-side route / 404.html trick / noindex), and whether to keep the off-ramp page. Commented on #70, removed `claude-ready`, added `needs-human`.
- Decisions: Did not pick up a second issue after stopping on #70 — one task per run rule applies even when the task outcome is a blocker (not a deliverable).
- Noticed for later: Issues #69 (biggest movers hero strip) and #72 (detail modal for single-point SKUs) remain claude-ready/P2 and are the logical next picks once the run completes.

## 2026-07-20T14:08Z — PM run
- Triage: #70 and #73 relabeled from `claude-ready` to `needs-human` — both are design-decision proposals requiring human input before E2 implementation can proceed. #70 asks for pre-render strategy guidance; #73 provides analysis and proposals based on SKU count exceeding 2,000 threshold.
- Created: none — queue has 2 open claude-ready issues (#69, #72), both E1 refinements; room available but no additional E1 sub-tasks to issue.
- Rationale: E1 is nearly complete: E1.1–E1.4 are shipped, E1.5 (#69 biggest movers) and E1.6 polish (#72 single-point modal) are queued and ready. Once #69 and #72 ship, E1 is done. E2 requires human decision on routing/pre-render strategy (now documented in #70 and #73 as needs-human). Per the playbook, not starting E2 without human advancement of the Current Epic line. Queue is healthy at 2/5; next PM run will create issues only after human decides on E2.1 and updates the Current Epic line in product-vision.md.

## 2026-07-20T14:38Z — run 2026-07-20-5
- Task: #75 E2.1a — Build a compact sku-index.json from data/
- Did: Created `app/scripts/build-sku-index.js` (ESM Node.js, no new deps) with exported `aggregateSkuIndex` pure function. Created `app/src/lib/skuIndex.ts` with `SkuEntry`, `SkuIndex`, `SkuRegion`, `SkuHistoryPoint` types plus a typed mirror of the aggregation function used by tests. Updated `npm run build` to `node scripts/build-sku-index.js && vite build` — generates `app/public/sku-index.json` (2.5 MB, 4 413 SKUs, `dist/sku-index.json` in the build output) before Vite bundles the app. Added `app/public/sku-index.json` to `.gitignore` (generated artifact). Added 8 tests in `skuIndex.test.ts` covering index shape, added/removed/changed history, multi-region aggregation, unknown-SKU guard, and empty inputs. 181 tests green; lint, typecheck, build all pass.
- Decisions: Build script is self-contained JavaScript (no tsx/ts-node) to avoid new devDependencies; the TypeScript module in `src/lib/skuIndex.ts` is the type-safe mirror tested by Vitest. Only SKUs present in `data/latest/` files are indexed (SKUs absent from current state are not useful for SKU detail pages). Empty latest files (openai-eu.json is `{}`) are skipped silently.
- Noticed for later: The index aggregates all regions for a given `skuName` into a single entry — some SKUs genuinely appear with multiple region entries in the same scope (different meter IDs for the same SKU). E2.1b (client-side routing) can group regions by `armRegionName` for display.

## 2026-07-20T15:20Z — run 2026-07-20-6
- Task: #77 E2.1c — Off-ramp page + per-page meta/OG tags for SKU pages
- Did: Implemented hash-based client-side routing (no new dependencies) via `lib/useRoute.ts` (`parseRoute` + `useRoute` hook) and a `Router` component in `Router.tsx`. `main.tsx` now renders `<Router />` which delegates to `<SkuPage>` for `#/sku/<family>` hashes or `<App>` for everything else. `SkuPage` loads `sku-index.json` via `lib/loadSkuIndex.ts` and branches on whether the SKU is known: known SKUs show a regions-price table and set `document.title`, `og:title`, `og:description`, `og:url` client-side; unknown SKUs show a "We don't track this SKU yet" off-ramp with a pre-filled GitHub issue-new link and a back link. `setMetaProperty` creates the `<meta>` element if it doesn't already exist (needed for jsdom tests and first-navigation to a SKU URL). Added 8 tests in `useRoute.test.ts` and 16 tests in `SkuPage.test.tsx`. 205 tests green; lint, typecheck, build all pass.
- Decisions: Used hash-based routing (`#/sku/<family>`) instead of History API paths — works on GitHub Pages without a 404.html redirect hack and requires no server configuration. `Router.tsx` extracted to its own file (lint rule `react-refresh/only-export-components` requires components to be in export-only files). `setMetaProperty` creates missing meta elements rather than silently no-oping, making the component robust to both production (tags in index.html) and test (bare jsdom document) environments.
- Noticed for later: E2.1b (#76) can fill in the SKU page with a price-history chart and direction badges; the `SkuPage` component is designed to be extended in place.

## 2026-07-20T15:45Z — run 2026-07-20-7
- Task: #69 E1.5: Biggest movers hero strip (7-day and 30-day)
- Did: Created `lib/movers.ts` with `computeMovers` (pure function, exported for testing) and supporting types (`MoverItem`, `MoversResult`). Created `BiggestMovers` component that renders two time-window sections (7-day and 30-day), each showing top 3 drops and top 3 increases by % magnitude. Items are clickable (`role="button"`, `tabIndex=0`, keyboard Enter/Space) and scroll to the `#price-changes-card` section on click. Loading state shows two skeleton windows; empty state shows "No price changes in this period" per window when no rows fall in the window. Mobile layout stacks windows and direction groups vertically. Added `id="price-changes-card"` to the card `<section>` in `App.tsx`. Updated README "Dashboard features" with the biggest-movers description. Added 19 tests in `BiggestMovers.test.tsx` and a separate `movers.test` would have been redundant (tests live in `BiggestMovers.test.tsx`); all 224 tests green; lint, typecheck, build all pass.
- Decisions: Moved `computeMovers` and types to `lib/movers.ts` rather than exporting from the component file — `react-refresh/only-export-components` lint rule (configured with `--max-warnings 0`) rejects non-component exports from component files. `handleMoverClick` in `App.tsx` takes no parameters since only the scroll side-effect matters (TypeScript allows `() => void` where `(key: string) => void` is expected). Magnitude exclusion of `new`/`removed` directions is inherited from `computeMovers` filter — only `drop`/`increase` rows with a valid `priceBefore` are eligible.
- Noticed for later: If multiple diffs on different dates are ever loaded (not just the latest), the 7-day/30-day filtering will become more meaningful — today all rows share the same `at` timestamp from the single latest diff.

## 2026-07-20T16:30Z — PM run
- Triage: none — no unlabeled or needs-human open issues
- Created: #82 E2.2 Full price-history chart for SKU detail page (region-selectable, P2), #83 E2.3 Region comparison overlay on SKU detail chart (P2), #84 E2.4 Trend summary card on SKU detail page (P2)
- Rationale: E1 is complete (all E1.x closed as of this morning). E2.1 initial implementation is done (#75 sku-index, #77 off-ramp page shipped; #76 client-side routing in flight). Current epic is E2; queue had 2 open claude-ready issues (#76 E2.1b, #72 detail modal). Created E2.2, E2.3, E2.4 to feed the developer queue toward the core E2 chart/comparison/summary features. Queue is now at cap of 5 open claude-ready issues.

## 2026-07-20T18:23Z — run 2026-07-20-8
- Task: #72 Detail modal: show current price + metadata when a SKU has only one data point
- Did: Split the `chartData.length < 2` condition in `PriceHistoryChart.tsx` into two distinct states. Zero data points: unchanged empty state ("Not enough history yet" + icon). One data point: new `.phc__single` layout that shows the current price (formatted with unit, colored by direction) and a `<dl>` metadata block with product name, region, and first-seen date — followed by the retained "Not enough history yet" message. Added corresponding CSS classes using only ADR 0002 tokens: grid-based `phc__single-meta` (max-content + 1fr two-column), `phc__single-price` in `--font-mono`/`--text-xl`. Updated the existing "1 point" test to assert on the price, product, region, and first-seen date. 224 tests green; lint, typecheck, build all pass.
- Decisions: Used `chartData[0].at` (from the history point) rather than `row.at` for the first-seen date — the history loader is authoritative. Used a `<dl>/<dt>/<dd>` structure for metadata semantics (accessible to screen readers); nested inside `.phc__single` as a flex column so the layout stacks naturally with the price and the "Not enough history yet" section below.
- Noticed for later: nothing new.

## 2026-07-20T21:45Z — run 2026-07-20-9
- Task: #76 E2.1b — Client-side /sku/<family>/ route rendering a SKU page
- Did: (1) Added inline `SkuHistory` sub-component to `SkuPage.tsx` that reads `entry.history` for the cheapest region and renders three states: 0 points → "No price changes recorded yet" empty state; 1 point → single-point display (price, region, first-seen date, chart-design skill pattern); ≥2 points → AreaChart matching chart-design skill (direction-colored stroke+fill at 12%, `ResponsiveContainer`, `CartesianGrid`, tooltip with date/price/change-vs-previous). (2) Changed `App.tsx` row click to navigate via `window.location.hash = '#/sku/<skuName>'` (replacing the now-redundant modal); removed `selectedRow`, `openerRef`, `handleChartClose`, Escape handler, and lazy `PriceHistoryChart` import. (3) Lazy-loaded `SkuPage` in `Router.tsx` (same pattern as PriceHistoryChart in App.tsx) so Recharts stays out of the main bundle — main chunk stayed at 167 kB, SkuPage chunk at 368 kB. Updated 3 existing tests (text duplication from new history section); added 4 new tests (0/1/2+ history points, drop color); replaced 3 modal tests in `App.test.tsx` with 1 navigation test. 225 tests green; lint, typecheck, build all pass.
- Decisions: Used `entry.history` from `sku-index.json` (no extra fetches) for the chart — consistent data source, no network cost. Picked the cheapest region as the primary region for the chart; region selector is E2.3 scope. `PriceHistoryChart.tsx` is kept as a component file (not deleted) but is no longer wired to any route — the SKU page fully replaces it.
- Noticed for later: `PriceHistoryChart.tsx` is now orphaned code; a future cleanup issue could remove it once E2 is stable.

## 2026-07-21T06:55Z — run 2026-07-21-1
- Task: #83 E2.3 — Region comparison overlay on SKU detail chart
- Did: Added "Compare all regions" toggle button to `SkuHistory` (visible when ≥2 regions have history AND primary region has ≥2 chart points). In compare mode: builds merged multi-region chart data (`buildMultiChartData`) with all eligible region timestamps, renders `AreaChart` with one `Area` per region using palette colors `#38BDF8`/`#FBBF24` (`fillOpacity={0}`, `connectNulls={false}`). `MultiRegionTooltip` shows date → per-region price (colored by series) → "Cheapest: <region> @ $X.XX" at the hovered timestamp. `cheapest-badge` below the chart shows the cheapest region now (from `entry.regions`). Heading updates to "Price history · N regions" in compare mode. Added 7 tests in a new `region comparison` describe block + multi-region fixture; updated Area mock to expose `dataKey`. 232 tests green; lint, typecheck, build all pass.
- Decisions: Palette limited to 2 ADR 0002 non-directional tokens (`#38BDF8`, `#FBBF24`); expanding to 6+ hues requires an ADR 0002 update (needs-human). With current data (2 regions max per tracked SKU), 2 colors cover all real cases. Eligible regions = those with ≥1 non-null history point (not ≥2) so single-point regions still appear in comparison. Multi-region data merges by exact timestamp (same diff file) so no interpolation needed.
- Noticed for later: If ADR 0002 is updated to add a categorical palette, `COMPARISON_PALETTE` in SkuPage.tsx is the single place to extend. `PriceHistoryChart.tsx` remains orphaned.
## 2026-07-21T03:55Z — run 2026-07-21-1
- Task: #82 E2.2 — Full price-history chart for SKU detail page (region-selectable)
- Did: Replaced the single-region `SkuHistory` component in `SkuPage.tsx` with a multi-region-aware version. Added `REGION_COLORS` palette (`#38BDF8`, `#FBBF24`) for multi-series charts. `historyRegions` is derived from `entry.history` (all regions with valid price points). A region selector (`role="group"`) renders toggle buttons with colored swatches when ≥2 history regions exist; default selection is the cheapest region. In single-region mode the existing direction color + 12% area fill are preserved; in multi-region mode each series uses a palette color with `fillOpacity={0}`. Added `MultiRegionTooltip` showing date → per-region name (colored) → price → change-vs-previous. Merged chart data aligns all timestamps across selected regions (gaps left as `undefined`, `connectNulls={false}`). Added `MultiRegionTooltip`, region-selector, and swatch CSS classes using only ADR 0002 tokens. 8 new tests: no selector for single region, selector with correct buttons, default region, add region, remove region, cannot deselect last, palette colors, heading text. 233 tests green; lint, typecheck, build all pass.
- Decisions: Used `AreaChart`+`Area` for both single and multi-region (no chart type switch); in multi-region mode `fillOpacity={0}` eliminates the fill, effectively making it a line chart — avoids complexity of switching chart component types. `REGION_COLORS` uses only accent blue and yellow (non-red/green ADR tokens) so the "red/green only for price direction" rule is not violated.
- Noticed for later: `PriceHistoryChart.tsx` remains orphaned. Only 2 palette colors defined — sufficient for current data (max 2–3 regions per SKU), but a third color would need a needs-human ADR update.
