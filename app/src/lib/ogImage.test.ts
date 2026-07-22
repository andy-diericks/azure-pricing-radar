import { describe, it, expect } from 'vitest'
import { slugify, computeOgData, ogImageUrl } from './ogImage'
import type { SkuEntry } from './skuIndex'

const NOW = new Date('2026-07-22T12:00:00Z')

function makeEntry(overrides: Partial<SkuEntry> = {}): SkuEntry {
  return {
    productName: 'Virtual Machines',
    regions: [
      { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.096, unitOfMeasure: '1 Hour' },
    ],
    history: [],
    ...overrides,
  }
}

describe('slugify', () => {
  it('lowercases and preserves underscores and hyphens', () => {
    expect(slugify('Standard_D2s_v5')).toBe('standard_d2s_v5')
  })

  it('replaces spaces with underscores', () => {
    expect(slugify('HB120-16rs_v3 Low Priority')).toBe('hb120-16rs_v3_low_priority')
  })

  it('collapses consecutive non-safe chars into one underscore', () => {
    expect(slugify('Standard  HDD  Managed')).toBe('standard_hdd_managed')
  })
})

describe('computeOgData', () => {
  it('returns price and region from cheapest region, null direction when no history', () => {
    const entry = makeEntry()
    const result = computeOgData(entry, NOW)
    expect(result.currentPrice).toBe(0.096)
    expect(result.region).toBe('westeurope')
    expect(result.direction).toBeNull()
    expect(result.pctChange).toBeNull()
  })

  it('computes drop direction from 30-day window', () => {
    const recentDate = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const oldDate = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const entry = makeEntry({
      history: [
        { at: oldDate, armRegionName: 'westeurope', retailPrice: 0.10, direction: 'changed', priceBefore: 0.12 },
        { at: recentDate, armRegionName: 'westeurope', retailPrice: 0.09, direction: 'changed', priceBefore: 0.10 },
      ],
    })
    const result = computeOgData(entry, NOW)
    expect(result.direction).toBe('drop')
    expect(result.pctChange).toBeLessThan(0)
  })

  it('computes increase direction from 30-day window', () => {
    const oldDate = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
    const recentDate = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const entry = makeEntry({
      history: [
        { at: oldDate, armRegionName: 'westeurope', retailPrice: 0.09, direction: 'changed', priceBefore: 0.08 },
        { at: recentDate, armRegionName: 'westeurope', retailPrice: 0.12, direction: 'changed', priceBefore: 0.09 },
      ],
    })
    const result = computeOgData(entry, NOW)
    expect(result.direction).toBe('increase')
    expect(result.pctChange).toBeGreaterThan(0)
  })

  it('returns stable when prices are equal across window', () => {
    const oldDate = new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const recentDate = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const entry = makeEntry({
      history: [
        { at: oldDate, armRegionName: 'westeurope', retailPrice: 0.096, direction: 'changed', priceBefore: 0.1 },
        { at: recentDate, armRegionName: 'westeurope', retailPrice: 0.096, direction: 'changed', priceBefore: 0.096 },
      ],
    })
    const result = computeOgData(entry, NOW)
    expect(result.direction).toBe('stable')
    expect(result.pctChange).toBe(0)
  })

  it('returns null direction when history is outside 30-day window', () => {
    const oldDate = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const entry = makeEntry({
      history: [
        { at: oldDate, armRegionName: 'westeurope', retailPrice: 0.09, direction: 'changed', priceBefore: 0.1 },
      ],
    })
    const result = computeOgData(entry, NOW)
    expect(result.direction).toBeNull()
  })
})

describe('ogImageUrl', () => {
  it('combines baseUrl, og-images path, and slugified name', () => {
    expect(ogImageUrl('/azure-pricing-radar/', 'Standard_D2s_v5')).toBe(
      '/azure-pricing-radar/og-images/standard_d2s_v5.svg',
    )
  })
})
