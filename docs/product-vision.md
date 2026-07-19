# Product vision — Azure Pricing Radar

The north star for backlog decisions. The product-manager run derives issues
from THIS file — never from imagination.

**Current epic: E1** — the PM works this epic's sub-tasks in order. Update
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

---

When an epic completes, journal "Epic <id> complete" and note what the human
should review before the next epic begins. The human then advances the
Current Epic line at the top of this file.
