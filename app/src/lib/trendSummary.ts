import type { SkuEntry } from './skuIndex'

export type TrendWindowStatus = 'ok' | 'insufficient' | 'stale'

export interface TrendWindow {
  status: TrendWindowStatus
  direction: 'drop' | 'increase' | 'stable' | null
  pctChange: number | null
}

export interface TrendSummaryResult {
  thirtyDay: TrendWindow
  ninetyDay: TrendWindow
  firstSeen: string | null
  changeCount: number
  currentPrice: number | null
  unitOfMeasure: string
}

function computeWindow(
  pricePoints: { at: string; price: number }[],
  windowDays: number,
  now: Date,
): TrendWindow {
  if (pricePoints.length < 2) {
    return { status: 'insufficient', direction: null, pctChange: null }
  }

  const cutoffMs = now.getTime() - windowDays * 24 * 60 * 60 * 1000
  const inWindow = pricePoints.filter((p) => new Date(p.at).getTime() >= cutoffMs)

  if (inWindow.length < 2) {
    return { status: 'stale', direction: null, pctChange: null }
  }

  const oldest = inWindow[0].price
  const newest = inWindow[inWindow.length - 1].price

  if (oldest === newest) {
    return { status: 'ok', direction: 'stable', pctChange: 0 }
  }

  const pctChange = ((newest - oldest) / oldest) * 100
  const direction = newest < oldest ? 'drop' : 'increase'
  return { status: 'ok', direction, pctChange }
}

export function computeTrendSummary(
  entry: SkuEntry,
  primaryRegion: string,
  now: Date = new Date(),
): TrendSummaryResult {
  const regionPoints = entry.history
    .filter((h) => h.armRegionName === primaryRegion && h.retailPrice !== null)
    .map((h) => ({ at: h.at, price: h.retailPrice as number }))
    .sort((a, b) => a.at.localeCompare(b.at))

  const thirtyDay = computeWindow(regionPoints, 30, now)
  const ninetyDay = computeWindow(regionPoints, 90, now)

  const allHistoryWithPrice = entry.history.filter((h) => h.retailPrice !== null)
  const firstSeen =
    allHistoryWithPrice.length > 0
      ? allHistoryWithPrice.reduce(
          (min, h) => (h.at < min ? h.at : min),
          allHistoryWithPrice[0].at,
        )
      : null

  // Count actual price movements in the region the trend and chart describe:
  // adjacent history points whose retail price differs. Counting only 'changed'
  // diff events (as before) missed moves that happen via remove + re-add, which
  // made the count show 0 even when the trend badge showed a large change.
  let changeCount = 0
  for (let i = 1; i < regionPoints.length; i++) {
    if (regionPoints[i].price !== regionPoints[i - 1].price) changeCount++
  }

  // "Current price" must be for the same region as the trend, otherwise the
  // headline number contradicts the chart below it.
  const primaryRegionEntry =
    entry.regions.find((r) => r.armRegionName === primaryRegion) ?? null
  const currentPrice =
    primaryRegionEntry?.retailPrice ??
    (regionPoints.length > 0 ? regionPoints[regionPoints.length - 1].price : null)

  return {
    thirtyDay,
    ninetyDay,
    firstSeen,
    changeCount,
    currentPrice,
    unitOfMeasure: primaryRegionEntry?.unitOfMeasure ?? '',
  }
}
