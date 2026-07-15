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
3. **Shareable moments** — a price drop page you can link on social media /
   Reddit / HN. Screenshots that explain themselves.
4. **Coverage growth** — more services and regions over time, added
   deliberately, never at the cost of 1–3.
5. **Visual excellence** — the dashboard should look like a polished
   product, not a data dump: strong typographic hierarchy, generous
   chart design, delightful details within ADR 0002's tokens.
   Roughly 1 in 4 backlog issues should be a design/polish task
   (e.g. "redesign the changes table row states", "improve chart
   tooltips and axis formatting", "empty states and loading skeletons").
   6. **Mobile-friendly** — the dashboard must be genuinely usable on a
   phone: readable tables (or card layouts under 640px), touch-friendly
   tap targets (min 44px), charts that resize without breaking, no
   horizontal scrolling except inside tables. Test viewport: 390px wide.
   Roughly 1 in 6 backlog issues should improve the mobile experience.
   7. **Fast** — performance is a feature: Lighthouse Performance score ≥ 90
   on the deployed site, initial load under 2 seconds on a mid-range
   phone, lazy-load heavy chart data, keep the JS bundle lean (no new
   dependencies for marginal gains). When a page or chart gets slow,
   fixing it takes priority over new features. Roughly 1 in 6 backlog
   issues should be a performance task (measure first, then optimize).

## Milestones
- **M1 — Working radar (now):** dashboard renders latest diffs as a
  color-coded table, per-SKU history charts, deployed on GitHub Pages, CI.
- **M2 — Daily digest:** AI-written plain-language summaries of each day's
  changes (quality bar: docs/examples.md), archive page, RSS feed.
- **M3 — Explorer:** search/filter by service, region, SKU; compare two
  regions; permalink to any SKU's history page.
- **M4 — Reach:** OpenGraph preview images per change, weekly digest markdown
  in the repo, more scopes (US regions, databases, AKS).

## Explicitly OUT of scope (do not create issues for these)
- User accounts, backends, databases — this stays a static site over `data/`.
- Cost calculators or estimation tools (different product).
- Non-Azure clouds.
- Monetization of any kind.
