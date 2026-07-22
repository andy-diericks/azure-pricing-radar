import type { SkuEntry } from './skuIndex'
import { computeTrendSummary } from './trendSummary'

export interface OgImageData {
  currentPrice: number | null
  unit: string
  region: string | null
  direction: 'drop' | 'increase' | 'stable' | null
  pctChange: number | null
}

/** Convert a SKU name to a safe filename slug (mirrors build-og-images.js). */
export function slugify(skuName: string): string {
  return skuName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Compute OG image data for a SKU entry (cheapest region, 30-day trend). */
export function computeOgData(entry: SkuEntry, now: Date = new Date()): OgImageData {
  const cheapest =
    entry.regions.length > 0
      ? entry.regions.slice().sort((a, b) => a.retailPrice - b.retailPrice)[0]
      : null

  const primaryRegion = cheapest?.armRegionName ?? ''
  const summary = computeTrendSummary(entry, primaryRegion, now)

  return {
    currentPrice: summary.currentPrice,
    unit: summary.unitOfMeasure,
    region: cheapest?.armRegionName ?? null,
    direction: summary.thirtyDay.direction,
    pctChange: summary.thirtyDay.pctChange,
  }
}

/** Return the absolute URL for a SKU's pre-generated OG image. */
export function ogImageUrl(baseUrl: string, skuName: string): string {
  return `${baseUrl}og-images/${slugify(skuName)}.svg`
}
