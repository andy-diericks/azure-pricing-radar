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

  const changeCount = entry.history.filter((h) => h.direction === 'changed').length

  const cheapestRegion = entry.regions
    .slice()
    .sort((a, b) => a.retailPrice - b.retailPrice)[0] ?? null

  return {
    thirtyDay,
    ninetyDay,
    firstSeen,
    changeCount,
    currentPrice: cheapestRegion?.retailPrice ?? null,
    unitOfMeasure: cheapestRegion?.unitOfMeasure ?? '',
  }
}
