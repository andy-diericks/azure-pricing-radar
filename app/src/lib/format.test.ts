import { describe, it, expect } from 'vitest'
import { formatPrice, formatDateAxis, formatDateFull, directionColor } from './format'

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
const FOUR_MONTHS_MS = 120 * 24 * 60 * 60 * 1000

describe('formatPrice', () => {
  it('shows 2 decimal places for whole numbers', () => {
    expect(formatPrice(1204)).toBe('$1204.00')
  })

  it('shows 4 decimals for small values', () => {
    expect(formatPrice(0.0042)).toBe('$0.0042')
  })

  it('normalises to minimum 2 decimals', () => {
    expect(formatPrice(0.1)).toBe('$0.10')
  })

  it('preserves meaningful decimals', () => {
    expect(formatPrice(0.096)).toBe('$0.096')
  })

  it('appends unit when provided', () => {
    expect(formatPrice(0.096, '1 Hour')).toBe('$0.096 / 1 Hour')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })
})

describe('formatDateAxis', () => {
  it('formats as "day Month" for short ranges', () => {
    const result = formatDateAxis('2026-07-12T00:00:00Z', TWO_WEEKS_MS)
    expect(result).toContain('12')
    expect(result).toContain('Jul')
  })

  it('formats as "Month Year" for long ranges', () => {
    const result = formatDateAxis('2026-07-12T00:00:00Z', FOUR_MONTHS_MS)
    expect(result).toContain('Jul')
    expect(result).toContain('2026')
    expect(result).not.toContain('12')
  })
})

describe('formatDateFull', () => {
  it('includes day, month, and year', () => {
    const result = formatDateFull('2026-07-12T00:00:00Z')
    expect(result).toContain('12')
    expect(result).toContain('Jul')
    expect(result).toContain('2026')
  })
})

describe('directionColor', () => {
  it('returns green for price drops', () => {
    expect(directionColor('drop')).toBe('#34D399')
  })

  it('returns red for price increases', () => {
    expect(directionColor('increase')).toBe('#F87171')
  })

  it('returns amber for new SKUs', () => {
    expect(directionColor('new')).toBe('#FBBF24')
  })

  it('returns accent blue for removed SKUs', () => {
    expect(directionColor('removed')).toBe('#38BDF8')
  })

  it('returns accent blue for unknown direction', () => {
    expect(directionColor('unknown')).toBe('#38BDF8')
  })
})
