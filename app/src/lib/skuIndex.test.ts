import { describe, it, expect } from 'vitest'
import { aggregateSkuIndex } from './skuIndex'
import type { SkuEntry, SkuIndex } from './skuIndex'

const VM_ENTRY_1 = {
  skuName: 'Standard_D2s_v5',
  productName: 'Virtual Machines Dsv5 Series',
  retailPrice: 0.096,
  unitPrice: 0.096,
  unitOfMeasure: '1 Hour',
  armRegionName: 'westeurope',
  meterName: 'D2s v5',
}

const VM_ENTRY_2 = {
  skuName: 'Standard_D4s_v5',
  productName: 'Virtual Machines Dsv5 Series',
  retailPrice: 0.192,
  unitPrice: 0.192,
  unitOfMeasure: '1 Hour',
  armRegionName: 'westeurope',
  meterName: 'D4s v5',
}

const sampleLatest = [
  {
    scope: 'vm-eu-west',
    data: {
      'KEY001|meter1|Consumption|': VM_ENTRY_1,
      'KEY002|meter2|Consumption|': VM_ENTRY_2,
    },
  },
]

const sampleDiffs = [
  {
    at: '2026-07-15T17:41:10.201545+00:00',
    added: [{ ...VM_ENTRY_1, key: 'KEY001|meter1|Consumption|' }],
    removed: [],
    changed: [],
  },
]

describe('aggregateSkuIndex', () => {
  it('returns an entry for every SKU in the latest files', () => {
    const skus = aggregateSkuIndex(sampleLatest, sampleDiffs)
    expect(Object.keys(skus)).toContain('Standard_D2s_v5')
    expect(Object.keys(skus)).toContain('Standard_D4s_v5')
  })

  it('populates productName, regions, and history for each entry', () => {
    const skus = aggregateSkuIndex(sampleLatest, sampleDiffs)
    const entry: SkuEntry = skus['Standard_D2s_v5']
    expect(entry.productName).toBe('Virtual Machines Dsv5 Series')
    expect(entry.regions).toHaveLength(1)
    expect(entry.regions[0]).toMatchObject({
      armRegionName: 'westeurope',
      scope: 'vm-eu-west',
      retailPrice: 0.096,
      unitOfMeasure: '1 Hour',
    })
    expect(entry.history).toHaveLength(1)
    expect(entry.history[0]).toMatchObject({
      at: '2026-07-15T17:41:10.201545+00:00',
      armRegionName: 'westeurope',
      retailPrice: 0.096,
      direction: 'added',
    })
  })

  it('records removed SKUs with null retailPrice', () => {
    const diffs = [
      {
        at: '2026-07-16T00:00:00Z',
        added: [],
        removed: [{ ...VM_ENTRY_1, key: 'KEY001|meter1|Consumption|' }],
        changed: [],
      },
    ]
    const skus = aggregateSkuIndex(sampleLatest, diffs)
    const removed = skus['Standard_D2s_v5'].history.find(h => h.direction === 'removed')
    expect(removed).toBeDefined()
    expect(removed?.retailPrice).toBeNull()
    expect(removed?.armRegionName).toBe('westeurope')
  })

  it('records changed SKUs with priceBefore', () => {
    const changed = {
      key: 'KEY001|meter1|Consumption|',
      before: { ...VM_ENTRY_1 },
      after: { ...VM_ENTRY_1, retailPrice: 0.086, unitPrice: 0.086 },
    }
    const diffs = [{ at: '2026-07-16T00:00:00Z', added: [], removed: [], changed: [changed] }]
    const skus = aggregateSkuIndex(sampleLatest, diffs)
    const point = skus['Standard_D2s_v5'].history.find(h => h.direction === 'changed')
    expect(point).toBeDefined()
    expect(point?.retailPrice).toBe(0.086)
    expect(point?.priceBefore).toBe(0.096)
  })

  it('ignores diff entries for SKUs absent from the latest files', () => {
    const diffs = [
      {
        at: '2026-07-15T17:41:10Z',
        added: [{ skuName: 'Unknown_SKU', retailPrice: 1.0, armRegionName: 'westeurope', key: 'X', productName: 'X', unitOfMeasure: '1 Hour', unitPrice: 1.0, meterName: 'X' }],
        removed: [],
        changed: [],
      },
    ]
    const skus = aggregateSkuIndex(sampleLatest, diffs)
    expect(skus).not.toHaveProperty('Unknown_SKU')
  })

  it('aggregates multiple regions for the same SKU within a scope', () => {
    const latest = [
      {
        scope: 'vm-eu-west',
        data: {
          'KEY1|m1|Consumption|': { ...VM_ENTRY_1, armRegionName: 'westeurope' },
          'KEY2|m2|Consumption|': { ...VM_ENTRY_1, armRegionName: 'northeurope', retailPrice: 0.105 },
        },
      },
    ]
    const skus = aggregateSkuIndex(latest, [])
    expect(skus['Standard_D2s_v5'].regions).toHaveLength(2)
    const regions = skus['Standard_D2s_v5'].regions.map(r => r.armRegionName)
    expect(regions).toContain('westeurope')
    expect(regions).toContain('northeurope')
  })

  it('handles empty latest and diff inputs', () => {
    const skus = aggregateSkuIndex([], [])
    expect(skus).toEqual({})
  })

  it('matches the SkuIndex schema shape', () => {
    const skus = aggregateSkuIndex(sampleLatest, sampleDiffs)
    const index: SkuIndex = { generatedAt: '2026-07-20T00:00:00.000Z', skus }
    expect(typeof index.generatedAt).toBe('string')
    expect(typeof index.skus).toBe('object')
    const entry = index.skus['Standard_D2s_v5']
    expect(typeof entry.productName).toBe('string')
    expect(Array.isArray(entry.regions)).toBe(true)
    expect(Array.isArray(entry.history)).toBe(true)
    expect(typeof entry.regions[0].armRegionName).toBe('string')
    expect(typeof entry.regions[0].scope).toBe('string')
    expect(typeof entry.regions[0].retailPrice).toBe('number')
    expect(typeof entry.regions[0].unitOfMeasure).toBe('string')
    expect(typeof entry.history[0].at).toBe('string')
    expect(typeof entry.history[0].direction).toBe('string')
  })
})
