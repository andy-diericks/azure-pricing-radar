# Product vision — Azure Pricing Radar

The north star for backlog decisions. The product-manager run derives issues
from THIS file — never from imagination.

**Current epic: E4** — the PM works this epic's sub-tasks in order. Update
this line by hand when an epic completes (the PM journals "Epic <id>
complete" to signal it's ready).

## Who it's for
FinOps engineers, cloud architects, and Azure practitioners who need to know
what Azure pricing did over time — something Microsoft doesn't show.

## The standard
**An Azure architect or a Microsoft engineer should open this and think
"this is the tool I wished existed."** Every feature is judged against that
bar, not against "does it render".

## What "great" looks like (in order)
1. **Trustworthy data** — accurate diffs, no gaps, transparent methodology.
2. **Instant answers** — "what changed this week?", "history of this SKU?",
   "is this region cheaper?" answered in under 10 seconds on the dashboard.
3. **Differentiation — history and openness.** Nearby tools (e.g.
   cloudprice.net) do cross-region/cloud comparison snapshots; we never
   compete on specs or multi-cloud — we win on "what changed and when",
   with fully open data.
4. **Shareable moments** — a price-drop page you can link on social media /
   Reddit / HN. Screenshots that explain themselves.
5. **Coverage growth** — more services and regions over time, added
   deliberately per the roadmap, never at the cost of 1–4.
6. **Visual excellence** — looks like a polished product, not a data dump:
   strong typographic hierarchy, generous chart design, delightful details
   within ADR 0002's tokens.
7. **Mobile-friendly** — genuinely usable on a phone: readable tables (or
   card layouts under 640px), touch targets >= 44px, responsive charts, no
   horizontal scrolling except inside tables. Test viewport: 390px.
8. **Fast** — Lighthouse Performance >= 90 on the deployed site, initial
   load under 2 seconds on a mid-range phone, lazy-loaded heavy chart data,
   lean JS bundle.

Items 6-8 are not separate backlog streams — they are acceptance criteria
that apply WITHIN each epic. Don't defer design, mobile, and performance to
the end of an epic; interleave them (E1 bakes this into E1.6, the pattern to
follow). Slowness or broken mobile on a shipped feature takes priority over
starting the next feature.

## Global constraints (apply to every issue, always)

**Out of scope — never create issues for these:**
- User accounts, backends, databases — this stays a static site over `data/`.
- Cost calculators or estimation tools (different product).
- Non-Azure clouds.
- Monetization of any kind.

**Frozen zones** — never create `claude-ready` issues that touch these; they
are `needs-human` proposals instead: the frozen ADRs (`docs/adr/`), the data
pipeline (`scripts/`), historical data (`data/`), and workflow files
(`.github/workflows/`).

**README is a product surface** — whenever scopes, features, cadences, or
the dashboard change in a user-visible way, updating the README is part of
the task's definition of done.

## Coverage roadmap (regions x services)

Current scopes live in `scripts/fetch_prices.py` (SCOPES). Growth rules:
- **One new scope per week maximum**, each via its own issue carrying the
  explicit exception to modify `scripts/`, with the README updated in the
  same task (ADR 0003 governs cadence wording).
- **Verify before adding**: confirm the exact `serviceName` and
  `armRegionName` return items in the Retail Prices API before proposing a
  scope issue. If a service has no separately-priced SKUs, open a
  `needs-human` issue with findings instead.
- Watch repo size and fetch duration; if a scope is very large, propose
  narrowing filters (`needs-human`) rather than skipping verification.

**Target regions (priority order):** Belgium Central (`belgiumcentral`,
new region launched Nov 2025 — its SKU rollout is itself the story) ->
North Europe (`northeurope`) -> France Central (`francecentral`) ->
Sweden Central (`swedencentral`). West Europe is already covered.

**Target services (priority order):** Virtual Machines (extend to the
regions above) -> Microsoft Fabric (capacity SKUs; include Fabric IQ only if
it appears as separately-priced items in the API — verify first) -> Storage
and Azure OpenAI (extend to the regions above afterwards).

Coverage sub-tasks are interleaved at most one per week and never block an
epic.

---

# Features & epics (the plan)

This is the single source of build order. The PM converts sub-tasks into
`claude-ready` issues IN ORDER within the Current Epic (top of file),
finishing an epic before starting the next unless the human changes the
Current Epic line. The developer builds one sub-task per run.

Each issue must still be one run of work with a checkable definition of done
and an out-of-scope line. If a sub-task is too big for one run, split it into
lettered parts (E1.3a, E1.3b) — never shrink its ambition to fit.

## E1 — The Change Feed (the beating heart)
A live, beautiful, filterable feed of every price change — the thing people
bookmark and check weekly.
- E1.1 Build-time aggregation: transform `data/diffs/**` into one compact,
  queryable `changes` index (date, service, region, SKU family, direction,
  %). Precomputed at build, not in the browser (data-reading skill).
- E1.2 Change Feed page: reverse-chronological cards showing SKU, region,
  old->new price, % badge color-coded by direction (chart-design + ADR 0002).
- E1.3 Faceted filters: multi-select by service, region, direction, plus a
  magnitude slider ("≥ 5% moves only"). URL-encoded so any filtered view is
  shareable.
- E1.4 Full-text SKU search with instant filtering.
- E1.5 "Biggest movers" hero strip: largest increases and drops of the last
  7/30 days.
- E1.6 Empty/loading/error states + mobile card layout + accessibility pass.

## E2 — SKU Detail Pages (the SEO & credibility engine)
One permalinked page per SKU family — the artifact people link in Slack and
that ranks in search.
- E2.1 Route per SKU family (`/sku/<family>`) with title + meta description.
  NOTE: pre-render only tracked SKU families (not the entire API catalog);
  if the count is large, use top-N pre-render + on-demand for the rest — a
  `needs-human` proposal to settle the approach comes before E2.1.
- E2.2 Full price-history line chart for that SKU (all history held),
  region-selectable.
- E2.3 Region comparison overlay: the SKU across N tracked regions as
  overlaid lines, with a "cheapest region right now" callout.
- E2.4 "Trend" summary: direction/magnitude over 30/90 days, first-seen
  date, number of changes — what snapshot tools can't show.
- E2.5 Auto-generated OpenGraph preview image per SKU page so links unfurl
  beautifully on Slack/Teams/Twitter/LinkedIn.

## E3 — The Daily Digest (the habit loop)
Plain-language summaries that turn raw diffs into something worth following.
- E3.1 Daily digest generation (changelog-writing skill): one markdown +
  JSON artifact per day, committed to the repo.
- E3.2 Digest archive page, browsable by date, with each day's biggest
  movers.
- E3.3 RSS/Atom feed of digests (architects live in feed readers).
- E3.4 "This week in Azure pricing" weekly rollup page + markdown file.
- E3.5 Add Target regions: Belgium Central (belgiumcentral, new region launched Nov 2025)
- E3.6 Add Target regions: North Europe (northeurope) and France Central (francecentral)
- E3.7 Add Target regions: Sweden Central (swedencentral).

## E4 — Beyond pay-as-you-go (the depth that earns respect)
The features that make FinOps people take it seriously. NOTE: E4 enlarges the
data pipeline and repo size — E4.1 requires a `needs-human` pipeline-design
proposal (likely a new ADR) BEFORE any scope change.
- E4.1 Add Reservation pricing (1yr/3yr, `type eq 'Reservation'`, preview
  API) as a new tracked dimension — never overwrite PAYG history.
- E4.2 Savings-plan rates (preview API `savingsPlan` array) as a further
  dimension.
- E4.3 Detail pages show PAYG vs 1yr vs 3yr vs savings-plan side by side,
  with effective %-off vs PAYG.
- E4.4 "Effective discount over time" chart: how a SKU's reservation/savings
  advantage has shifted historically — genuinely novel, nobody publishes it.

## E5 — Signature polish (the "wow" on first open)
- E5.1 A striking landing/overview page: headline stats (SKUs tracked,
  regions, changes recorded, history depth), latest biggest movers, a
  live-feeling pulse of the data.
- E5.2 Command-palette (Cmd-K) navigation: jump to any SKU, region, or view.
- E5.3 Dark/light theme within ADR 0002 tokens (extend the ADR first).
- E5.4 Shareable chart export (PNG), watermarked with the site URL — every
  share becomes a backlink.
- E5.5 Sub-2s performance pass and Lighthouse >= 95 across key pages.

## E6 — Design & consistency (from the design review)
Follow-ups from a full look-and-feel / consistency audit of the shipped app.
Ordered by value to users (FinOps engineers / architects), not by effort.
These map to standards 1 (trustworthy), 2 (instant answers), and 6 (visual
excellence) above — they are quality debt on already-shipped features, so per
that rule they take priority over starting a brand-new epic.

**Already shipped** (design-review quick wins, PR on `claude/design-review-quickwins`):
- ✅ "Biggest movers" cards now open the SKU's history page (were a dead end).
- ✅ "Clear all" + removable active-filter chips on the change feed.
- ✅ "Removed" is one consistent colour across every surface.
- ✅ Direction/background colours read from tokens, not hard-coded hex.

Remaining, highest user value first:
- E6.1 **Global SKU lookup** — a prominent search that routes to
  `#/sku/<family>` for *any* tracked SKU, not just rows currently in the feed.
  Answers "history of this SKU?" directly; the detail page's "request tracking"
  off-ramp already assumes people arrive this way. (Distinct from E1.4, which
  only filters visible feed rows.)
- E6.2 **Data provenance footer** — one line on the source (Azure Retail
  Prices API), the 6-hourly cadence, a "how this works / methodology" link, and
  the GitHub repo. Directly serves standard 1 (trustworthy) and shareability.
- E6.3 **Rescale the magnitude slider** — real Azure moves cluster under ~30%,
  so the linear 0–100% range wastes most of its travel. Cap near 50% or use a
  non-linear scale.
- E6.4 **Stronger typographic hierarchy** — section headings sit at 16px (=body);
  promote to the existing 20/28 steps and add a real page title / hero stat so
  the eye has somewhere to land. Tokens already exist.
- E6.5 **Header nav as tabs + calmer status** — make "This week" / "Digests"
  read as navigation, and move the "last checked / last changed" timestamps out
  of the crowded title row.
- E6.6 **Shared `CountBadge` component** — the drop/increase/new/removed counts
  are drawn three different ways (inline text, pills, big-number grid). One
  component used everywhere; also makes the "removed" colour single-sourced.
- E6.7 **Shared `StateMessage` component** — standardise empty / loading / error
  states (the table has polished icon states; movers, digests and the chart use
  plain text).
- E6.8 **Unify the two digest designs** — the weekly (`wd__*`) and daily-archive
  (`da__*`) pages are visually divergent; share summary / count / mover
  components so digests feel like one family.
- E6.9 **De-duplicate 7-day vs 30-day movers** — when the two windows are
  identical (sparse data) collapse to one, so it doesn't read like a bug.
- E6.10 **Sortable-column affordance** — table headers only reveal they sort
  once active; add a faint resting glyph on hover/focus.
- E6.11 **Wordmark links home on every page** (it's a `<span>` on home, an
  `<a>` on subpages).
- E6.12 **Mobile pass at 390px** — verify the header and filter groups wrap
  cleanly and touch targets stay ≥ 44px (standard 7).
- E6.13 **Chart colours from tokens** — `SkuPage`'s palette/axis colours are JS
  string literals echoing the tokens; source them from one place so the chart
  can't drift from the palette.
- E6.14 **Soft-surface tokens** — the many ad-hoc `rgba(<token>, 0.08–0.13)`
  tints should become a small named set so tinted badges match everywhere.

**Needs-human first (touch frozen ADR 0002 — propose, don't self-serve):**
- E6.H1 Add a `--color-border` token. Borders today are two hand-written
  shades (`#1e2d47`, `#1a2640`) with no token at all.
- E6.H2 Formalise "removed = secondary grey" in ADR 0002 (currently only a
  convention in code).

---

When an epic completes, journal "Epic <id> complete" and note what the human
should review before the next epic begins. The human then advances the
Current Epic line at the top of this file.
