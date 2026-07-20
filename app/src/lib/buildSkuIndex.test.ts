/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { toSlug, buildSkuIndex } from '../../scripts/build-sku-index.js'
import type { DiffEntry, LatestEntry } from '../../scripts/build-sku-index.js'

const LATEST: Record<string, Record<string, LatestEntry>> = {
  'vm-eu-west': {
    'SKU1|M1|Consumption|': {
      retailPrice: 0.096,
      unitOfMeasure: '1 Hour',
      productName: 'Virtual Machines Dsv5 Series',
      skuName: 'Standard_D2s_v5',
      armRegionName: 'westeurope',
    },
    'SKU2|M2|Consumption|': {
      retailPrice: 0.05,
      unitOfMeasure: '1 Hour',
      productName: 'Virtual Machines Dsv5 Series',
      skuName: 'Standard_D2s_v5 Spot',
      armRegionName: 'westeurope',
    },
  },
  'storage-eu-west': {
    'SKU3|M3|Consumption|': {
      retailPrice: 0.02,
      unitOfMeasure: '1 GB/Month',
      productName: 'Azure Blob Storage',
      skuName: 'LRS Data Stored',
      armRegionName: 'westeurope',
    },
  },
}

const DIFFS: DiffEntry[] = [
  {
    scope: 'vm-eu-west',
    at: '2026-07-15T17:41:10Z',
    added: [
      {
        key: 'SKU1|M1|Consumption|',
        retailPrice: 0.096,
        unitOfMeasure: '1 Hour',
        productName: 'Virtual Machines Dsv5 Series',
        skuName: 'Standard_D2s_v5',
        armRegionName: 'westeurope',
      },
    ],
    removed: [],
    changed: [],
  },
  {
    scope: 'vm-eu-west',
    at: '2026-07-16T10:00:00Z',
    added: [],
    removed: [],
    changed: [
      {
        key: 'SKU1|M1|Consumption|',
        before: { retailPrice: 0.096 },
        after: { retailPrice: 0.085 },
      },
    ],
  },
]

describe('toSlug', () => {
  it('lowercases and replaces underscores with hyphens', () => {
    expect(toSlug('Standard_D2s_v5')).toBe('standard-d2s-v5')
  })

  it('replaces spaces with hyphens', () => {
    expect(toSlug('D2s v5 Spot')).toBe('d2s-v5-spot')
  })

  it('collapses consecutive separators into one hyphen', () => {
    expect(toSlug('M416-208s_v2 Low Priority')).toBe('m416-208s-v2-low-priority')
  })

  it('strips leading and trailing hyphens', () => {
    expect(toSlug('_SKU_')).toBe('sku')
  })
})

describe('buildSkuIndex', () => {
  it('creates an entry per unique skuName slug', () => {
    const { skus } = buildSkuIndex(LATEST, DIFFS)
    expect(skus['standard-d2s-v5']).toBeDefined()
    expect(skus['standard-d2s-v5-spot']).toBeDefined()
    expect(skus['lrs-data-stored']).toBeDefined()
  })

  it('sets skuName, productName, scope, and regions', () => {
    const { skus } = buildSkuIndex(LATEST, DIFFS)
    const entry = skus['standard-d2s-v5']
    expect(entry.skuName).toBe('Standard_D2s_v5')
    expect(entry.productName).toBe('Virtual Machines Dsv5 Series')
    expect(entry.scope).toBe('vm-eu-west')
    expect(entry.regions).toContain('westeurope')
  })

  it('populates item fields from latest data', () => {
    const { skus } = buildSkuIndex(LATEST, DIFFS)
    const [item] = skus['standard-d2s-v5'].items
    expect(item.key).toBe('SKU1|M1|Consumption|')
    expect(item.region).toBe('westeurope')
    expect(item.unit).toBe('1 Hour')
    expect(item.price).toBe(0.096)
  })

  it('builds price history in chronological order', () => {
    const { skus } = buildSkuIndex(LATEST, DIFFS)
    const [item] = skus['standard-d2s-v5'].items
    expect(item.history).toHaveLength(2)
    expect(item.history[0]).toEqual({ at: '2026-07-15T17:41:10Z', price: 0.096 })
    expect(item.history[1]).toEqual({ at: '2026-07-16T10:00:00Z', price: 0.085 })
  })

  it('records null price for removed items', () => {
    const removedDiff: DiffEntry = {
      scope: 'vm-eu-west',
      at: '2026-07-17T00:00:00Z',
      added: [],
      removed: [{ key: 'SKU1|M1|Consumption|', retailPrice: 0.085 }],
      changed: [],
    }
    const { skus } = buildSkuIndex(LATEST, [...DIFFS, removedDiff])
    const [item] = skus['standard-d2s-v5'].items
    expect(item.history[2]).toEqual({ at: '2026-07-17T00:00:00Z', price: null })
  })

  it('returns an empty skus object for empty input', () => {
    const { skus } = buildSkuIndex({}, [])
    expect(Object.keys(skus)).toHaveLength(0)
  })

  it('includes a generated ISO timestamp', () => {
    const { generated } = buildSkuIndex(LATEST, DIFFS)
    expect(generated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('handles multiple scopes independently', () => {
    const { skus } = buildSkuIndex(LATEST, DIFFS)
    const storage = skus['lrs-data-stored']
    expect(storage.scope).toBe('storage-eu-west')
    expect(storage.items[0].unit).toBe('1 GB/Month')
    expect(storage.items[0].history).toHaveLength(0)
  })
})
