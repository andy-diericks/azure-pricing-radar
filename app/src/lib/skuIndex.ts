export interface SkuRegion {
  armRegionName: string
  scope: string
  retailPrice: number
  unitOfMeasure: string
}

export interface SkuHistoryPoint {
  at: string
  armRegionName: string
  retailPrice: number | null
  priceBefore?: number
  direction: 'added' | 'removed' | 'changed'
}

export interface SkuEntry {
  productName: string
  regions: SkuRegion[]
  history: SkuHistoryPoint[]
}

export interface SkuIndex {
  generatedAt: string
  skus: Record<string, SkuEntry>
}

type LatestEntry = {
  skuName: string
  productName: string
  retailPrice: number
  unitOfMeasure: string
  armRegionName: string
  [key: string]: unknown
}

type DiffItem = {
  skuName: string
  retailPrice: number
  armRegionName: string
  [key: string]: unknown
}

type ChangedItem = {
  before: DiffItem
  after: DiffItem
}

type DiffEntry = {
  at: string
  added?: DiffItem[]
  removed?: DiffItem[]
  changed?: ChangedItem[]
}

type LatestFileEntry = {
  scope: string
  data: Record<string, LatestEntry>
}

/**
 * Aggregate latest price data and diff history into a per-SKU index.
 * Pure function — no I/O. Mirrors the JS implementation in scripts/build-sku-index.js.
 */
export function aggregateSkuIndex(
  latestEntries: LatestFileEntry[],
  diffEntries: DiffEntry[],
): Record<string, SkuEntry> {
  const skus: Record<string, SkuEntry> = {}

  for (const { scope, data } of latestEntries) {
    for (const entry of Object.values(data)) {
      const { skuName, productName, retailPrice, unitOfMeasure, armRegionName } = entry
      if (!skus[skuName]) {
        skus[skuName] = { productName, regions: [], history: [] }
      }
      skus[skuName].regions.push({ armRegionName, scope, retailPrice, unitOfMeasure })
    }
  }

  for (const { at, added, removed, changed } of diffEntries) {
    for (const item of added ?? []) {
      const sku = skus[item.skuName]
      if (sku) {
        sku.history.push({ at, armRegionName: item.armRegionName, retailPrice: item.retailPrice, direction: 'added' })
      }
    }
    for (const item of removed ?? []) {
      const sku = skus[item.skuName]
      if (sku) {
        sku.history.push({ at, armRegionName: item.armRegionName, retailPrice: null, direction: 'removed' })
      }
    }
    for (const item of changed ?? []) {
      const sku = skus[item.after.skuName]
      if (sku) {
        sku.history.push({
          at,
          armRegionName: item.after.armRegionName,
          retailPrice: item.after.retailPrice,
          priceBefore: item.before.retailPrice,
          direction: 'changed',
        })
      }
    }
  }

  return skus
}
