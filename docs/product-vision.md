# Product vision — Azure Pricing Radar

The north star for backlog decisions. The product-manager run derives issues
from THIS file — never from imagination.

## Who it's for
FinOps engineers, cloud architects, and Azure practitioners who need to know
what Azure pricing did over time — something Microsoft doesn't show.

## What "great" looks like (in order)
1. **Trustworthy data** — accurate diffs, no gaps, transparent methodology.
2. **Instant answers** — "what changed this week?", "history of this SKU?",
   "is this region cheaper?" answered in under 10 seconds on the dashboard.
3. **Differentiation** — history and openness. Nearby tools (e.g. cloudprice.net) do cross-region/cloud comparison snapshots; we never compete on specs or multi-cloud — we win on 'what changed and when', with fully open data.
4. **Shareable moments** — a price drop page you can link on social media /
   Reddit / HN. Screenshots that explain themselves.
5. **Coverage growth** — more services and regions over time, added
   deliberately per the roadmap below, never at the cost of 1–3.
6. **Visual excellence** — the dashboard should look like a polished
   product, not a data dump: strong typographic hierarchy, generous
   chart design, delightful details within ADR 0002's tokens.
   Roughly 1 in 4 backlog issues should be a design/polish task.
7. **Mobile-friendly** — genuinely usable on a phone: readable tables
   (or card layouts under 640px), touch targets ≥ 44px, responsive charts,
   no horizontal scrolling except inside tables. Test viewport: 390px.
   Roughly 1 in 6 backlog issues should improve the mobile experience.
8. **Fast** — Lighthouse Performance ≥ 90 on the deployed site, initial
   load under 2 seconds on a mid-range phone, lazy-load heavy chart data,
   lean JS bundle. Slowness fixes take priority over new features.
   Roughly 1 in 6 backlog issues should be a performance task.

## Coverage roadmap (regions × services)

Current scopes are defined in `scripts/fetch_prices.py` (SCOPES). Growth
rules:
- **One new scope per week maximum**, each via its own issue with the
  explicit exception to modify `scripts/`, and README updated in the same
  task (see ADR 0003 consequences for cadence wording).
- **Verify before adding**: before proposing a scope issue, confirm the
  exact `serviceName` and `armRegionName` values return items in the
  Retail Prices API. If a service has no separately-priced SKUs (possible
  for very new products), open a `needs-human` issue with findings instead
  of a scope issue.
- Watch repo size and fetch duration; if a scope is very large, propose
  narrowing filters (`needs-human`) rather than skipping verification.

**Target regions (priority order):**
1. Belgium Central (`belgiumcentral`) — new region (launched Nov 2025),
   flagship: rollout of SKUs there is itself the story.
2. North Europe (`northeurope`)
3. France Central (`francecentral`)
4. Sweden Central (`swedencentral`)
(West Europe already covered.)

**Target services (priority order):**
1. Virtual Machines — extend to the regions above.
2. Microsoft Fabric — capacity SKUs; include Fabric IQ pricing if and only
   if it appears as separately-priced items in the API (verify first).
3. Storage and Azure OpenAI — extend to the regions above after 1–2.

## Milestones
- **M1 — Working radar (done/finishing):** dashboard renders latest diffs
  as a color-coded table, per-SKU history charts, deployed on GitHub
  Pages, CI.
- **M2 — Explorer & filtering:** filter everything by region, service,
  and SKU family; a dedicated cost-over-time view (pick a SKU or SKU
  family → its full price history chart, with region comparison overlay);
  permalink to any SKU's history page.
- **M3 — Daily digest:** AI-written plain-language summaries of each day's
  changes (quality bar: docs/examples.md), archive page, RSS feed.
- **M4 — Reach:** OpenGraph preview images per change, weekly digest
  markdown in the repo, coverage per the roadmap above.

# Features & epics (the ambition)

This section turns milestones into concrete, ambitious features, each broken
into run-sized sub-tasks. The PM converts sub-tasks into `claude-ready`
issues IN ORDER, one epic at a time, finishing an epic before starting the
next unless the human reorders. The developer builds one sub-task per run.

Guiding standard: **an Azure architect or a Microsoft engineer should open
this and think "this is the tool I wished existed."** Every feature is
judged against that bar, not against "does it render".

## Epic priority order
E1 → E2 → E3 → E4 → E5. Coverage-expansion sub-tasks (new regions/services
from the roadmap) are interleaved at most one per week and never block an
epic.

---

## E1 — The Change Feed (the beating heart)
A live, beautiful, filterable feed of every price change — the thing people
bookmark and check weekly.
- E1.1 Build-time aggregation: transform `data/diffs/**` into a single
  compact, queryable `changes` index (date, service, region, SKU family,
  direction, %). Precomputed at build, not in the browser (data-reading
  skill).
- E1.2 Change Feed page: reverse-chronological cards, each showing SKU,
  region, old→new price, % badge color-coded by direction (chart-design +
  ADR 0002).
- E1.3 Faceted filters: multi-select by service, region, direction, and a
  magnitude slider (e.g. "≥ 5% moves only"). URL-encoded so any filtered
  view is shareable.
- E1.4 Full-text SKU search with instant filtering.
- E1.5 "Biggest movers" hero strip at the top: the largest increases and
  drops of the last 7/30 days.
- E1.6 Empty/loading/error states + mobile card layout + a11y pass.

## E2 — SKU Detail Pages (the SEO & credibility engine)
One permalinked page per SKU family — the artifact people link in Slack and
that ranks in search.
- E2.1 Static route per SKU family (`/sku/<family>`), pre-rendered, with
  title + meta description ("Standard_D4s_v5 price history & regional
  comparison").
- E2.2 Full price-history line chart for that SKU (all history we hold),
  region-selectable.
- E2.3 Region comparison overlay: same SKU across N tracked regions as
  overlaid lines, with a "cheapest region right now" callout.
- E2.4 "Trend" summary: direction and magnitude over 30/90 days, first-seen
  date, number of changes — the stuff cloudprice-style snapshots can't show.
- E2.5 OpenGraph preview image per SKU page (auto-generated) so links
  unfurl beautifully on Slack/Teams/Twitter/LinkedIn.

## E3 — The Daily Digest (the habit loop)
Plain-language summaries that turn raw diffs into something worth
subscribing to.
- E3.1 Daily digest generation (changelog-writing skill): one markdown +
  JSON artifact per day, committed to the repo.
- E3.2 Digest archive page: browsable by date, with the biggest-movers
  summary per day.
- E3.3 RSS/Atom feed of digests (architects live in feed readers).
- E3.4 "This week in Azure pricing" rollup: a weekly summary page and
  markdown file in the repo.

## E4 — Beyond pay-as-you-go (the depth that earns respect)
The features that make FinOps people take it seriously.
- E4.1 Add Reservation pricing to the pipeline (1yr/3yr, `type eq
  'Reservation'`, preview API) — verify per roadmap, exception to edit
  `scripts/`. Store as new tracked dimension, never overwrite PAYG history.
- E4.2 Savings plan rates (preview API `savingsPlan` array) as a further
  dimension.
- E4.3 Detail pages show PAYG vs 1yr vs 3yr vs savings-plan side by side,
  with effective %-off vs PAYG.
- E4.4 "Effective discount over time" chart: how the reservation/savings
  advantage for a SKU has shifted historically — genuinely novel, nobody
  publishes this.

## E5 — Signature polish (the "wow" on first open)
- E5.1 A striking landing/overview page: headline stats (SKUs tracked,
  regions, changes recorded, history depth), latest biggest movers, a
  live-feeling pulse of the data.
- E5.2 Command-palette (⌘K) navigation: jump to any SKU, region, or view.
- E5.3 Dark/light theme within ADR 0002 tokens (extend the ADR first).
- E5.4 Shareable chart export (PNG) for any chart, watermarked with the
  site URL — every share is a backlink.
- E5.5 Sub-2s performance pass and Lighthouse ≥ 95 across key pages.

---

## Rules for the PM working this list
- Convert sub-tasks to issues IN ORDER within the current epic. Don't skip
  ahead to a shinier epic.
- Each issue still must be one run of work with a checkable definition of
  done; if a sub-task is too big, split it into lettered parts
  (E1.3a, E1.3b) rather than shrinking its ambition.
- Keep the design/mobile/performance quotas from the main vision — they
  apply WITHIN each epic, not instead of it.
- When an epic completes, journal "Epic <id> complete" and note what the
  user should review before the next epic begins.


## Explicitly OUT of scope (do not create issues for these)
- User accounts, backends, databases — this stays a static site over `data/`.
- Cost calculators or estimation tools (different product).
- Non-Azure clouds.
- Monetization of any kind.

The README is a product surface: whenever scopes, features, cadences, or
the dashboard change in a user-visible way, updating the README is part
of the task's definition of done.
