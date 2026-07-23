import { describe, it, expect } from 'vitest'
import {
  computePctChange,
  formatDigestPrice,
  computeDigestData,
  renderMarkdown,
  renderJson,
  SCOPE_DISPLAY_NAMES,
  REGION_DISPLAY_NAMES,
  type DiffFile,
  type DigestData,
} from './digest'

const makeItem = (overrides: object = {}) => ({
  skuName: 'Standard_D2s_v5',
  productName: 'Virtual Machines Dsv5 Series',
  retailPrice: 0.096,
  unitOfMeasure: '1 Hour',
  armRegionName: 'westeurope',
  ...overrides,
})

const makeChangedEntry = (before: number, after: number, overrides: object = {}) => ({
  key: 'key1',
  before: makeItem({ retailPrice: before, ...overrides }),
  after: makeItem({ retailPrice: after, ...overrides }),
})

describe('computePctChange', () => {
  it('computes a price drop correctly', () => {
    expect(computePctChange(0.192, 0.176)).toBeCloseTo(-8.333, 2)
  })

  it('computes a price increase correctly', () => {
    expect(computePctChange(0.096, 0.1056)).toBeCloseTo(10, 2)
  })

  it('returns null when before is 0 (from-free guard)', () => {
    expect(computePctChange(0, 0.5)).toBeNull()
  })

  it('returns 0 when prices are equal', () => {
    expect(computePctChange(0.1, 0.1)).toBe(0)
  })
})

describe('formatDigestPrice', () => {
  it('formats a price with two decimal places minimum', () => {
    expect(formatDigestPrice(0.1, '1 Hour')).toBe('$0.10/1 Hour')
  })

  it('strips trailing zeros beyond two decimals', () => {
    expect(formatDigestPrice(0.192, '1 Hour')).toBe('$0.192/1 Hour')
  })

  it('keeps up to 6 significant decimal places', () => {
    expect(formatDigestPrice(0.000365, '10K')).toBe('$0.000365/10K')
  })
})

describe('computeDigestData', () => {
  const vmDiff: DiffFile = {
    scope: 'vm-eu-west',
    at: '2026-07-16T10:00:00+00:00',
    added: [],
    removed: [],
    changed: [
      makeChangedEntry(0.192, 0.176),  // -8.3% drop
      makeChangedEntry(0.096, 0.1056, { skuName: 'Standard_D4s_v5' }),  // +10% increase
      makeChangedEntry(1.0, 1.002, { skuName: 'Standard_M128s' }),  // +0.2% — below threshold
    ],
  }

  it('counts drops and increases correctly', () => {
    const result = computeDigestData('2026-07-16', [vmDiff])
    expect(result.totalDrops).toBe(1)
    expect(result.totalIncreases).toBe(1)
  })

  it('filters changes under 0.5% threshold', () => {
    const result = computeDigestData('2026-07-16', [vmDiff])
    expect(result.sections[0].topMovers).toHaveLength(2)
  })

  it('counts new SKUs and removed SKUs', () => {
    const diff: DiffFile = {
      scope: 'storage-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [makeItem(), makeItem({ skuName: 'Standard_B1ms' })],
      removed: [makeItem({ skuName: 'Standard_A1' })],
      changed: [],
    }
    const result = computeDigestData('2026-07-16', [diff])
    expect(result.totalNewSkus).toBe(2)
    expect(result.totalRemoved).toBe(1)
  })

  it('sorts top movers by |pct| descending, drops before increases at equal magnitude', () => {
    const diff: DiffFile = {
      scope: 'vm-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [
        makeChangedEntry(1.0, 1.05, { skuName: 'SKU_B' }),   // +5% increase
        makeChangedEntry(1.0, 0.95, { skuName: 'SKU_A' }),   // -5% drop
        makeChangedEntry(1.0, 1.10, { skuName: 'SKU_C' }),   // +10% increase
      ],
    }
    const result = computeDigestData('2026-07-16', [diff])
    const movers = result.sections[0].topMovers
    expect(movers[0].skuName).toBe('SKU_C')   // 10% — biggest
    expect(movers[1].skuName).toBe('SKU_A')   // 5% drop — before increase at same magnitude
    expect(movers[2].skuName).toBe('SKU_B')   // 5% increase
  })

  it('caps top movers at 3', () => {
    const diff: DiffFile = {
      scope: 'vm-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [
        makeChangedEntry(1.0, 0.9, { skuName: 'SKU_A' }),
        makeChangedEntry(1.0, 0.85, { skuName: 'SKU_B' }),
        makeChangedEntry(1.0, 0.8, { skuName: 'SKU_C' }),
        makeChangedEntry(1.0, 0.75, { skuName: 'SKU_D' }),
      ],
    }
    const result = computeDigestData('2026-07-16', [diff])
    expect(result.sections[0].topMovers).toHaveLength(3)
  })

  it('handles empty diff (no changes, no new SKUs)', () => {
    const diff: DiffFile = {
      scope: 'vm-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [],
    }
    const result = computeDigestData('2026-07-16', [diff])
    expect(result.totalDrops).toBe(0)
    expect(result.totalIncreases).toBe(0)
    expect(result.totalNewSkus).toBe(0)
    expect(result.sections[0].topMovers).toHaveLength(0)
  })

  it('handles multiple scopes and aggregates totals', () => {
    const vmDiff2: DiffFile = {
      scope: 'vm-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [makeChangedEntry(1.0, 0.9)],  // -10% drop
    }
    const storageDiff: DiffFile = {
      scope: 'storage-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [makeItem()],
      removed: [],
      changed: [makeChangedEntry(0.5, 0.55, { skuName: 'StorageSKU' })],  // +10% increase
    }
    const result = computeDigestData('2026-07-16', [vmDiff2, storageDiff])
    expect(result.totalDrops).toBe(1)
    expect(result.totalIncreases).toBe(1)
    expect(result.totalNewSkus).toBe(1)
    expect(result.sections).toHaveLength(2)
  })

  it('uses SCOPE_DISPLAY_NAMES for known scopes', () => {
    const diff: DiffFile = {
      scope: 'vm-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [],
    }
    const result = computeDigestData('2026-07-16', [diff])
    expect(result.sections[0].displayName).toBe(SCOPE_DISPLAY_NAMES['vm-eu-west'])
  })

  it('uses REGION_DISPLAY_NAMES for known regions', () => {
    const diff: DiffFile = {
      scope: 'vm-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [makeChangedEntry(1.0, 0.9)],  // westeurope region
    }
    const result = computeDigestData('2026-07-16', [diff])
    expect(result.sections[0].topMovers[0].regionDisplay).toBe(REGION_DISPLAY_NAMES['westeurope'])
  })

  it('falls back to raw scope name for unknown scopes', () => {
    const diff: DiffFile = {
      scope: 'unknown-scope',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [],
    }
    const result = computeDigestData('2026-07-16', [diff])
    expect(result.sections[0].displayName).toBe('unknown-scope')
  })

  it('skips changed entries where before.retailPrice is 0', () => {
    const diff: DiffFile = {
      scope: 'vm-eu-west',
      at: '2026-07-16T10:00:00+00:00',
      added: [],
      removed: [],
      changed: [makeChangedEntry(0, 0.5)],  // from free — skip
    }
    const result = computeDigestData('2026-07-16', [diff])
    expect(result.totalDrops).toBe(0)
    expect(result.totalIncreases).toBe(0)
    expect(result.sections[0].topMovers).toHaveLength(0)
  })

  it('handles an empty diffFiles array', () => {
    const result = computeDigestData('2026-07-16', [])
    expect(result.totalDrops).toBe(0)
    expect(result.sections).toHaveLength(0)
  })
})

describe('renderMarkdown', () => {
  const noChangesData: DigestData = {
    date: '2026-07-16',
    totalDrops: 0,
    totalIncreases: 0,
    totalNewSkus: 0,
    totalRemoved: 0,
    sections: [],
  }

  it('renders the headline with the date', () => {
    const md = renderMarkdown(noChangesData)
    expect(md).toContain('# Azure pricing changes for 2026-07-16')
  })

  it('renders "No changes detected" when all counts are zero', () => {
    const md = renderMarkdown(noChangesData)
    expect(md).toContain('_No changes detected._')
  })

  it('renders drop and increase counts in the summary', () => {
    const data: DigestData = {
      ...noChangesData,
      totalDrops: 3,
      totalIncreases: 1,
    }
    const md = renderMarkdown(data)
    expect(md).toContain('3 price drops')
    expect(md).toContain('1 price increase')
  })

  it('uses singular "drop" when count is 1', () => {
    const data: DigestData = { ...noChangesData, totalDrops: 1 }
    const md = renderMarkdown(data)
    expect(md).toContain('_1 price drop._')
  })

  it('renders new SKU count with locale formatting', () => {
    const data: DigestData = { ...noChangesData, totalNewSkus: 8478 }
    const md = renderMarkdown(data)
    expect(md).toContain('8,478 new SKUs')
  })

  it('renders a section header for each scope section', () => {
    const data: DigestData = {
      ...noChangesData,
      sections: [
        {
          scope: 'vm-eu-west',
          displayName: 'Virtual Machines · West Europe',
          drops: 0, increases: 0, newSkus: 0, removed: 0, topMovers: [],
        },
      ],
    }
    const md = renderMarkdown(data)
    expect(md).toContain('## Virtual Machines · West Europe')
  })

  it('renders "No changes detected" for a section with all-zero counts', () => {
    const data: DigestData = {
      ...noChangesData,
      sections: [
        {
          scope: 'vm-eu-west',
          displayName: 'Virtual Machines · West Europe',
          drops: 0, increases: 0, newSkus: 0, removed: 0, topMovers: [],
        },
      ],
    }
    const md = renderMarkdown(data)
    expect(md).toContain('_No changes detected._')
  })

  it('renders top movers as bullet points with sign, before/after price', () => {
    const data: DigestData = {
      ...noChangesData,
      totalDrops: 1,
      sections: [
        {
          scope: 'vm-eu-west',
          displayName: 'Virtual Machines · West Europe',
          drops: 1, increases: 0, newSkus: 0, removed: 0,
          topMovers: [
            {
              skuName: 'Standard_D2s_v5',
              productName: 'Virtual Machines Dsv5 Series',
              armRegionName: 'westeurope',
              regionDisplay: 'West Europe',
              priceBefore: 0.192,
              priceAfter: 0.176,
              unitOfMeasure: '1 Hour',
              pctChange: -8.3,
              direction: 'drop',
            },
          ],
        },
      ],
    }
    const md = renderMarkdown(data)
    expect(md).toContain('- Standard_D2s_v5 (West Europe): -8.3%')
    expect(md).toContain('$0.192/1 Hour → $0.176/1 Hour')
  })

  it('renders a + sign for price increases', () => {
    const data: DigestData = {
      ...noChangesData,
      totalIncreases: 1,
      sections: [
        {
          scope: 'vm-eu-west',
          displayName: 'Virtual Machines · West Europe',
          drops: 0, increases: 1, newSkus: 0, removed: 0,
          topMovers: [
            {
              skuName: 'Standard_E8s_v5',
              productName: 'Virtual Machines Esv5 Series',
              armRegionName: 'westeurope',
              regionDisplay: 'West Europe',
              priceBefore: 0.504,
              priceAfter: 0.528,
              unitOfMeasure: '1 Hour',
              pctChange: 4.8,
              direction: 'increase',
            },
          ],
        },
      ],
    }
    const md = renderMarkdown(data)
    expect(md).toContain('+4.8%')
  })
})

describe('renderJson', () => {
  it('produces valid JSON with a generatedAt field', () => {
    const data: DigestData = {
      date: '2026-07-16',
      totalDrops: 0, totalIncreases: 0, totalNewSkus: 0, totalRemoved: 0, sections: [],
    }
    const json = renderJson(data, '2026-07-16T12:00:00.000Z')
    const parsed = JSON.parse(json)
    expect(parsed.generatedAt).toBe('2026-07-16T12:00:00.000Z')
    expect(parsed.date).toBe('2026-07-16')
  })

  it('includes all digest fields in JSON output', () => {
    const data: DigestData = {
      date: '2026-07-16',
      totalDrops: 2, totalIncreases: 1, totalNewSkus: 5, totalRemoved: 0,
      sections: [],
    }
    const json = renderJson(data, '2026-07-16T12:00:00.000Z')
    const parsed = JSON.parse(json)
    expect(parsed.totalDrops).toBe(2)
    expect(parsed.totalIncreases).toBe(1)
    expect(parsed.totalNewSkus).toBe(5)
  })
})
