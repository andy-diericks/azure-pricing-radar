# ADR 0002 — Design system (FROZEN)

Status: accepted · Date: 2026-07-15

## Tokens
- Background: `#0B1120` (page), `#111A2E` (cards). Light mode: out of scope for now.
- Text: `#E6EDF7` primary, `#93A4BE` secondary.
- Accent: `#38BDF8` (links, highlights). Price drop: `#34D399`. Price increase: `#F87171`. New SKU: `#FBBF24`.
- Font: Inter (UI), JetBrains Mono (prices, SKU ids). Sizes: 13/14/16/20/28px only.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px only. Border radius: 8px cards, 6px controls.

## Principles
- Dense but calm: this is a data product; charts and tables are the heroes.
- Every price change is color-coded by direction using the tokens above.
- No gradients, no glassmorphism, no animation longer than 150ms.
- Mobile: readable, not pixel-perfect. Desktop-first.

## Consequences
New colors, fonts, sizes, or spacing values require updating this ADR via a
`needs-human` issue first. Claude never introduces off-token styles.
