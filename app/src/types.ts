export interface PriceItem {
  key: string
  retailPrice: number
  unitPrice: number
  unitOfMeasure: string
  productName: string
  skuName: string
  meterName: string
  armRegionName: string
}

export interface PriceChangeItem {
  key: string
  before: PriceItem
  after: PriceItem
}

export interface DiffFile {
  scope: string
  at: string
  added: PriceItem[]
  removed: PriceItem[]
  changed: PriceChangeItem[]
}

export type ChangeDirection = 'new' | 'removed' | 'drop' | 'increase'

export interface TableRow {
  key: string
  itemKey: string
  direction: ChangeDirection
  scope: string
  productName: string
  skuName: string
  unitOfMeasure: string
  armRegionName: string
  priceBefore: number | null
  priceAfter: number
  at: string
}

export interface DiffManifestEntry {
  path: string
  scope: string
  date: string
}
