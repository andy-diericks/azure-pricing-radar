const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000

export function formatPrice(value: number, unit?: string): string {
  const s = value.toFixed(6).replace(/0+$/, '')
  const decimals = s.includes('.') ? s.length - s.indexOf('.') - 1 : 0
  const price = decimals < 2 ? `$${value.toFixed(2)}` : `$${s}`
  return unit ? `${price} / ${unit}` : price
}

export function formatDateAxis(isoDate: string, rangeMs: number): string {
  const d = new Date(isoDate)
  if (rangeMs < THREE_MONTHS_MS) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  }
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatDateFull(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatPctChange(priceBefore: number | null, priceAfter: number, direction: string): string {
  if (direction !== 'drop' && direction !== 'increase') return '—'
  if (priceBefore === null || priceBefore === 0) return '—'
  const pct = ((priceAfter - priceBefore) / priceBefore) * 100
  const fixed = pct.toFixed(1)
  return pct >= 0 ? `+${fixed}%` : `${fixed}%`
}

export function directionColor(direction: string): string {
  const map: Record<string, string> = {
    drop: '#34D399',
    increase: '#F87171',
    new: '#FBBF24',
    removed: '#38BDF8',
  }
  return map[direction] ?? '#38BDF8'
}
