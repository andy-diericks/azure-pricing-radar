import type { TableRow } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000
export const WINDOW_7_MS = 7 * DAY_MS
export const WINDOW_30_MS = 30 * DAY_MS
const TOP_N = 3

export interface MoverItem {
  row: TableRow
  pct: number
}

export interface MoversResult {
  drops: MoverItem[]
  increases: MoverItem[]
}

export function computeMovers(rows: TableRow[], windowMs: number, now: number): MoversResult {
  const cutoff = now - windowMs
  const eligible = rows.filter(
    r =>
      (r.direction === 'drop' || r.direction === 'increase') &&
      r.priceBefore !== null &&
      r.priceBefore !== 0 &&
      // Exclude "changes" where the retail price did not actually move. These
      // arise when a non-price field changed but retailPrice stayed equal — the
      // diff loader still labels them 'increase', which would otherwise surface
      // as a misleading "+0.0%" biggest mover.
      r.priceAfter !== r.priceBefore &&
      new Date(r.at).getTime() >= cutoff,
  )

  const withPct = eligible.map(r => ({
    row: r,
    pct: Math.abs(((r.priceAfter - r.priceBefore!) / r.priceBefore!) * 100),
  }))

  return {
    drops: withPct
      .filter(m => m.row.direction === 'drop')
      .sort((a, b) => b.pct - a.pct)
      .slice(0, TOP_N),
    increases: withPct
      .filter(m => m.row.direction === 'increase')
      .sort((a, b) => b.pct - a.pct)
      .slice(0, TOP_N),
  }
}
