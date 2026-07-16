---
name: chart-design
description: How to build charts for this dashboard — Recharts conventions, price/date axis formatting, change-direction colors, tooltips, empty and loading states. Use for any task that creates or modifies a chart, sparkline, or data visualization.
---

# Chart design conventions

Applies ADR 0002 tokens to charts. Read `docs/adr/0002-design-system.md` for
the tokens themselves — this skill covers how to use them in charts.
Library: Recharts only (ADR 0001).

## Axes
- Price axis (Y): format with the currency and sensible precision —
  `$0.0042` needs 4 decimals, `$1,204` needs 0. Write one shared
  `formatPrice(value, unit)` helper in `app/src/lib/format.ts` and reuse it
  everywhere; never inline one-off formatters.
- If a series spans more than ~2 orders of magnitude, use a log scale and
  say so in the axis label.
- Date axis (X): tick density adapts to range — daily ticks under 2 weeks,
  weekly under 3 months, monthly beyond. Format: `12 Jul` / `Jul 2026`.
  Never show raw ISO timestamps to users.
- Axis text: secondary text color, 13px. No axis lines heavier than 1px.

## Color = direction, always
- Price decrease: `#34D399`. Increase: `#F87171`. New SKU: `#FBBF24`.
  Neutral/unchanged series: accent `#38BDF8`.
- Never use red/green for anything other than price direction — no
  decorative use of those two colors anywhere in a chart.
- Lines: 2px, no dots except on hover/active. Area fills: same hue at
  ~12% opacity, only for single-series charts.

## Tooltips
- Every chart has a tooltip. Content order: date → SKU/scope name →
  price (formatted) → change vs previous point (absolute + %).
- Dark card background (`#111A2E`), 8px radius, JetBrains Mono for numbers.

## States (each chart ships with all three)
- Loading: skeleton block of the chart's final size — no spinners, no
  layout shift when data arrives.
- Empty: short human sentence ("No changes recorded for this SKU yet"),
  secondary text color, centered. Never render an empty axes frame.
- Error: same pattern, with a plain-language message. Never a stack trace.

## Responsiveness
- Always wrap in `ResponsiveContainer`. Test at 390px width: ticks must
  not overlap (reduce count, don't shrink font below 11px).
- Height: 200px on mobile, 280–320px on desktop.

## Definition of done for any chart PR
Screenshot in the PR showing: normal state with real `data/` content,
AND either the empty or loading state. Both desktop and 390px width.
