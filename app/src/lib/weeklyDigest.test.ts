import { describe, it, expect } from 'vitest'
import {
  getIsoWeekLabel,
  getIsoWeekBounds,
  filterDigestsForWeek,
  computeWeeklyDigest,
  renderWeeklyMarkdown,
  renderWeeklyJson,
} from './weeklyDigest'
import type { DigestData } from './digest'

describe('getIsoWeekLabel', () => {
  it('returns correct ISO week for a Monday', () => {
    expect(getIsoWeekLabel(new Date('2026-07-13T00:00:00Z'))).toBe('2026-W29')
  })

  it('returns correct ISO week for a Sunday (end of week)', () => {
    expect(getIsoWeekLabel(new Date('2026-07-19T00:00:00Z'))).toBe('2026-W29')
  })

  it('returns W30 for 2026-07-20 (Monday)', () => {
    expect(getIsoWeekLabel(new Date('2026-07-20T00:00:00Z'))).toBe('2026-W30')
  })

  it('returns W30 for 2026-07-24', () => {
    expect(getIsoWeekLabel(new Date('2026-07-24T00:00:00Z'))).toBe('2026-W30')
  })

  it('pads single-digit week numbers', () => {
    expect(getIsoWeekLabel(new Date('2026-01-05T00:00:00Z'))).toBe('2026-W02')
  })
})

describe('getIsoWeekBounds', () => {
  it('returns Monday–Sunday bounds for W29', () => {
    const { start, end } = getIsoWeekBounds('2026-W29')
    expect(start).toBe('2026-07-13')
    expect(end).toBe('2026-07-19')
  })

  it('returns Monday–Sunday bounds for W30', () => {
    const { start, end } = getIsoWeekBounds('2026-W30')
    expect(start).toBe('2026-07-20')
    expect(end).toBe('2026-07-26')
  })

  it('handles week 1 of year', () => {
    const { start, end } = getIsoWeekBounds('2026-W01')
    expect(start).toBe('2025-12-29')
    expect(end).toBe('2026-01-04')
  })
})

describe('filterDigestsForWeek', () => {
  const digests: DigestData[] = [
    { date: '2026-07-12', totalDrops: 0, totalIncreases: 0, totalNewSkus: 0, totalRemoved: 0, sections: [] },
    { date: '2026-07-15', totalDrops: 1, totalIncreases: 0, totalNewSkus: 0, totalRemoved: 0, sections: [] },
    { date: '2026-07-20', totalDrops: 0, totalIncreases: 1, totalNewSkus: 0, totalRemoved: 0, sections: [] },
  ]

  it('filters to digests within the ISO week', () => {
    const result = filterDigestsForWeek(digests, '2026-W29')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-07-15')
  })

  it('returns empty when no digests fall in week', () => {
    expect(filterDigestsForWeek(digests, '2026-W31')).toHaveLength(0)
  })
})

const MOVER_DROP = {
  skuName: 'Standard_D2s_v5',
  productName: 'Virtual Machines DSv5',
  armRegionName: 'westeurope',
  regionDisplay: 'West Europe',
  priceBefore: 0.1,
  priceAfter: 0.09,
  unitOfMeasure: '1 Hour',
  pctChange: -10.0,
  direction: 'drop' as const,
}

const MOVER_INCREASE = {
  skuName: 'Standard_D4s_v5',
  productName: 'Virtual Machines DSv5',
  armRegionName: 'westeurope',
  regionDisplay: 'West Europe',
  priceBefore: 0.2,
  priceAfter: 0.22,
  unitOfMeasure: '1 Hour',
  pctChange: 10.0,
  direction: 'increase' as const,
}

const DIGEST_1: DigestData = {
  date: '2026-07-15',
  totalDrops: 1,
  totalIncreases: 1,
  totalNewSkus: 100,
  totalRemoved: 0,
  sections: [
    {
      scope: 'vm-eu-west',
      displayName: 'Virtual Machines · West Europe',
      drops: 1,
      increases: 1,
      newSkus: 100,
      removed: 0,
      topMovers: [MOVER_DROP, MOVER_INCREASE],
    },
  ],
}

const DIGEST_2: DigestData = {
  date: '2026-07-16',
  totalDrops: 0,
  totalIncreases: 1,
  totalNewSkus: 0,
  totalRemoved: 2,
  sections: [
    {
      scope: 'storage-eu-west',
      displayName: 'Storage · West Europe',
      drops: 0,
      increases: 1,
      newSkus: 0,
      removed: 2,
      topMovers: [MOVER_INCREASE],
    },
  ],
}

describe('computeWeeklyDigest', () => {
  it('returns zero totals for empty digest list', () => {
    const result = computeWeeklyDigest('2026-W29', [])
    expect(result.totalDrops).toBe(0)
    expect(result.totalIncreases).toBe(0)
    expect(result.daysWithData).toBe(0)
    expect(result.topMovers).toHaveLength(0)
    expect(result.sections).toHaveLength(0)
  })

  it('aggregates totals across multiple digests', () => {
    const result = computeWeeklyDigest('2026-W29', [DIGEST_1, DIGEST_2])
    expect(result.totalDrops).toBe(1)
    expect(result.totalIncreases).toBe(2)
    expect(result.totalNewSkus).toBe(100)
    expect(result.totalRemoved).toBe(2)
    expect(result.daysWithData).toBe(2)
  })

  it('sets correct week bounds', () => {
    const result = computeWeeklyDigest('2026-W29', [DIGEST_1])
    expect(result.weekStart).toBe('2026-07-13')
    expect(result.weekEnd).toBe('2026-07-19')
    expect(result.isoWeek).toBe('2026-W29')
  })

  it('collects top movers across sections (max 5)', () => {
    const result = computeWeeklyDigest('2026-W29', [DIGEST_1, DIGEST_2])
    expect(result.topMovers.length).toBeLessThanOrEqual(5)
  })

  it('deduplicates movers by skuName+region, keeping highest |pct|', () => {
    const moverHigherDrop = { ...MOVER_DROP, pctChange: -20.0 }
    const digestA: DigestData = { ...DIGEST_1, sections: [{ ...DIGEST_1.sections[0], topMovers: [MOVER_DROP] }] }
    const digestB: DigestData = { ...DIGEST_1, date: '2026-07-16', sections: [{ ...DIGEST_1.sections[0], topMovers: [moverHigherDrop] }] }
    const result = computeWeeklyDigest('2026-W29', [digestA, digestB])
    const d2 = result.topMovers.find(m => m.skuName === 'Standard_D2s_v5')
    expect(d2?.pctChange).toBe(-20.0)
  })

  it('sorts top movers by |pct| descending, drops before increases at equal magnitude', () => {
    const result = computeWeeklyDigest('2026-W29', [DIGEST_1])
    const [first, second] = result.topMovers
    expect(Math.abs(first.pctChange)).toBeGreaterThanOrEqual(Math.abs(second?.pctChange ?? 0))
    if (Math.abs(first.pctChange) === Math.abs(second?.pctChange ?? 0)) {
      expect(first.direction).toBe('drop')
    }
  })

  it('collects servicesAffected for sections with drops or increases', () => {
    const result = computeWeeklyDigest('2026-W29', [DIGEST_1, DIGEST_2])
    expect(result.servicesAffected).toContain('Virtual Machines · West Europe')
    expect(result.servicesAffected).toContain('Storage · West Europe')
  })

  it('collects regionsAffected from top movers', () => {
    const result = computeWeeklyDigest('2026-W29', [DIGEST_1])
    expect(result.regionsAffected).toContain('West Europe')
  })

  it('merges sections from multiple digests for the same scope', () => {
    const digestSameScope: DigestData = {
      date: '2026-07-16',
      totalDrops: 2,
      totalIncreases: 0,
      totalNewSkus: 0,
      totalRemoved: 0,
      sections: [{ ...DIGEST_1.sections[0], date: '2026-07-16', drops: 2, increases: 0, topMovers: [] } as never],
    }
    const result = computeWeeklyDigest('2026-W29', [DIGEST_1, digestSameScope])
    const vmSection = result.sections.find(s => s.scope === 'vm-eu-west')
    expect(vmSection?.drops).toBe(3)
    expect(vmSection?.increases).toBe(1)
  })
})

describe('renderWeeklyMarkdown', () => {
  it('includes week header', () => {
    const data = computeWeeklyDigest('2026-W29', [DIGEST_1])
    const md = renderWeeklyMarkdown(data)
    expect(md).toContain('# This week in Azure pricing: 2026-W29 (2026-07-13 – 2026-07-19)')
  })

  it('includes summary line', () => {
    const data = computeWeeklyDigest('2026-W29', [DIGEST_1])
    const md = renderWeeklyMarkdown(data)
    expect(md).toContain('1 price drop, 1 price increase')
  })

  it('shows no-changes summary when no drops or increases', () => {
    const empty: DigestData = { date: '2026-07-15', totalDrops: 0, totalIncreases: 0, totalNewSkus: 0, totalRemoved: 0, sections: [] }
    const data = computeWeeklyDigest('2026-W29', [empty])
    expect(renderWeeklyMarkdown(data)).toContain('No changes detected')
  })

  it('includes top movers in section', () => {
    const data = computeWeeklyDigest('2026-W29', [DIGEST_1])
    const md = renderWeeklyMarkdown(data)
    expect(md).toContain('Standard_D2s_v5')
    expect(md).toContain('-10.0%')
  })
})

describe('renderWeeklyJson', () => {
  it('produces valid JSON with generatedAt and week fields', () => {
    const data = computeWeeklyDigest('2026-W29', [DIGEST_1])
    const json = JSON.parse(renderWeeklyJson(data, '2026-07-24T00:00:00.000Z'))
    expect(json.generatedAt).toBe('2026-07-24T00:00:00.000Z')
    expect(json.isoWeek).toBe('2026-W29')
    expect(json.weekStart).toBe('2026-07-13')
  })
})
