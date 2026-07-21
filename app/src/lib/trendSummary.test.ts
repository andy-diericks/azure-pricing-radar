import { describe, it, expect } from 'vitest'
import { computeTrendSummary } from './trendSummary'
import type { SkuEntry } from './skuIndex'

const NOW = new Date('2026-07-21T12:00:00Z')

function makeEntry(overrides: Partial<SkuEntry> = {}): SkuEntry {
  return {
    productName: 'Virtual Machines Dsv5 Series',
    regions: [
      { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.088, unitOfMeasure: '1 Hour' },
    ],
    history: [],
    ...overrides,
  }
}

describe('computeTrendSummary', () => {
  describe('insufficient history', () => {
    it('returns insufficient for 30-day and 90-day when no history', () => {
      const entry = makeEntry({ history: [] })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.status).toBe('insufficient')
      expect(result.ninetyDay.status).toBe('insufficient')
      expect(result.thirtyDay.direction).toBeNull()
      expect(result.thirtyDay.pctChange).toBeNull()
    })

    it('returns insufficient when only 1 history point', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.status).toBe('insufficient')
      expect(result.ninetyDay.status).toBe('insufficient')
    })
  })

  describe('stale data', () => {
    it('returns stale for 30-day window when all history is older than 30 days', () => {
      const entry = makeEntry({
        history: [
          { at: '2025-05-01T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.100, direction: 'added' },
          { at: '2025-05-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.090, priceBefore: 0.100, direction: 'changed' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.status).toBe('stale')
      expect(result.thirtyDay.direction).toBeNull()
    })

    it('returns ok for 90-day window when history is within 90 but not 30 days', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-05-01T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.100, direction: 'added' },
          { at: '2026-05-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.090, priceBefore: 0.100, direction: 'changed' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.status).toBe('stale')
      expect(result.ninetyDay.status).toBe('ok')
    })
  })

  describe('price direction', () => {
    it('computes drop direction when price decreased', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
          { at: '2026-07-16T12:00:00Z', armRegionName: 'westeurope', retailPrice: 0.088, priceBefore: 0.096, direction: 'changed' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.status).toBe('ok')
      expect(result.thirtyDay.direction).toBe('drop')
      expect(result.thirtyDay.pctChange).toBeCloseTo(-8.333, 2)
    })

    it('computes increase direction when price went up', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.088, direction: 'added' },
          { at: '2026-07-16T12:00:00Z', armRegionName: 'westeurope', retailPrice: 0.096, priceBefore: 0.088, direction: 'changed' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.direction).toBe('increase')
      expect(result.thirtyDay.pctChange).toBeCloseTo(9.091, 2)
    })

    it('computes stable direction when price did not change', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
          { at: '2026-07-16T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.direction).toBe('stable')
      expect(result.thirtyDay.pctChange).toBe(0)
    })
  })

  describe('metadata', () => {
    it('returns first-seen date as the earliest history timestamp', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-16T12:00:00Z', armRegionName: 'westeurope', retailPrice: 0.088, direction: 'changed' },
          { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.firstSeen).toBe('2026-07-15T17:41:10Z')
    })

    it('returns null firstSeen when no history with non-null price', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: null, direction: 'removed' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.firstSeen).toBeNull()
    })

    it('counts only changed direction entries', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
          { at: '2026-07-16T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.088, priceBefore: 0.096, direction: 'changed' },
          { at: '2026-07-17T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.092, priceBefore: 0.088, direction: 'changed' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.changeCount).toBe(2)
    })

    it('returns changeCount 0 when no changed entries', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.changeCount).toBe(0)
    })

    it('returns currentPrice from cheapest region', () => {
      const entry = makeEntry({
        regions: [
          { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.088, unitOfMeasure: '1 Hour' },
          { armRegionName: 'northeurope', scope: 'vm-eu-west', retailPrice: 0.095, unitOfMeasure: '1 Hour' },
        ],
        history: [],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.currentPrice).toBe(0.088)
      expect(result.unitOfMeasure).toBe('1 Hour')
    })

    it('returns null currentPrice and empty unitOfMeasure when no regions', () => {
      const entry = makeEntry({ regions: [], history: [] })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.currentPrice).toBeNull()
      expect(result.unitOfMeasure).toBe('')
    })
  })

  describe('primary region isolation', () => {
    it('only uses history for the specified primary region', () => {
      const entry = makeEntry({
        history: [
          { at: '2026-07-15T00:00:00Z', armRegionName: 'northeurope', retailPrice: 0.100, direction: 'added' },
          { at: '2026-07-16T00:00:00Z', armRegionName: 'northeurope', retailPrice: 0.090, priceBefore: 0.100, direction: 'changed' },
        ],
      })
      const result = computeTrendSummary(entry, 'westeurope', NOW)
      expect(result.thirtyDay.status).toBe('insufficient')
    })
  })
})
