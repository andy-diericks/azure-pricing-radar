export interface HistoryPoint {
  at: string
  price: number | null
}

export interface SkuItem {
  key: string
  region: string
  unit: string
  price: number
  history: HistoryPoint[]
}

export interface SkuFamily {
  skuName: string
  productName: string
  scope: string
  regions: string[]
  items: SkuItem[]
}

export interface LatestEntry {
  retailPrice: number
  unitOfMeasure: string
  productName: string
  skuName: string
  armRegionName: string
}

export interface DiffAdded extends LatestEntry {
  key: string
}

export interface DiffChanged {
  key: string
  before: { retailPrice: number }
  after: { retailPrice: number }
}

export interface DiffRemoved {
  key: string
  retailPrice: number
}

export interface DiffEntry {
  scope: string
  at: string
  added: DiffAdded[]
  removed: DiffRemoved[]
  changed: DiffChanged[]
}

export interface SkuIndex {
  generated: string
  skus: Record<string, SkuFamily>
}

export declare function toSlug(skuName: string): string

export declare function buildSkuIndex(
  latestByScope: Record<string, Record<string, LatestEntry>>,
  diffs: DiffEntry[],
): SkuIndex
