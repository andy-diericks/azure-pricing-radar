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
