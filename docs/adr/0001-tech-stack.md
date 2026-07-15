# ADR 0001 — Tech stack (FROZEN)

Status: accepted · Date: 2026-07-15

## Decision
- Dashboard: **Vite + React + TypeScript**, in `app/`.
- Charts: **Recharts**. No other charting library.
- Styling: plain CSS with design tokens (see ADR 0002). No CSS framework,
  no Tailwind, no component library.
- Hosting: **GitHub Pages**, built by CI from `app/` reading `data/`.
- Data pipeline: **Python 3.12 + requests** in `scripts/`, no other deps.
- Tests: **Vitest** (+ Playwright for visual checks once the UI stabilizes).
- Package manager: npm. Node 22.

## Consequences
Claude Code never introduces alternative frameworks, chart libraries, CSS
frameworks, or build tools. Proposals to revisit any of this = issue labeled
`needs-human`, never a unilateral change.
