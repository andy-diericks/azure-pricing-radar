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
3. **Differentiation** — history and openness. Nearby tools (e.g. cloudprice.net) do cross-region/cloud comparison snapshots; we never compete on specs or multi-cloud — we win on 'what changed and when', with fully open data."
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

## Explicitly OUT of scope (do not create issues for these)
- User accounts, backends, databases — this stays a static site over `data/`.
- Cost calculators or estimation tools (different product).
- Non-Azure clouds.
- Monetization of any kind.

The README is a product surface: whenever scopes, features, cadences, or
the dashboard change in a user-visible way, updating the README is part
of the task's definition of done.
