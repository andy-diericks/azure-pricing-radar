import { useState, useEffect, useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { loadSkuIndex } from '../lib/loadSkuIndex'
import { formatPrice, formatDateAxis, formatDateFull, directionColor } from '../lib/format'
import type { SkuEntry, SkuHistoryPoint, SkuIndex } from '../lib/skuIndex'
import '../App.css'
import './SkuPage.css'

interface Props {
  family: string
}

const REPO_URL = 'https://github.com/andy-diericks/azure-pricing-radar'

// ADR 0002 tokens available for categorical (non-directional) series.
// Expanding beyond 2 colors requires an ADR 0002 update (needs-human).
const COMPARISON_PALETTE = ['#38BDF8', '#FBBF24']
const REGION_COLORS: readonly string[] = ['#38BDF8', '#FBBF24']

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function buildDescription(family: string, entry: SkuEntry): string {
  const cheapest = entry.regions
    .slice()
    .sort((a, b) => a.retailPrice - b.retailPrice)[0]
  const priceStr = cheapest
    ? ` Current price from ${formatPrice(cheapest.retailPrice)}/${cheapest.unitOfMeasure.toLowerCase().replace(/^1 /, '')}.`
    : ''
  return `Azure retail pricing for ${family} (${entry.productName}).${priceStr}`
}

interface ChartPoint {
  at: string
  price: number
}

interface MultiPoint {
  at: string
  [region: string]: string | number | undefined
}

function buildMultiChartData(
  history: SkuHistoryPoint[],
  regions: string[],
): MultiPoint[] {
  const allTimestamps = [
    ...new Set(
      history
        .filter((h) => regions.includes(h.armRegionName) && h.retailPrice !== null)
        .map((h) => h.at),
    ),
  ].sort()

  return allTimestamps.map((at) => {
    const point: MultiPoint = { at }
    for (const region of regions) {
      const h = history.find(
        (p) => p.at === at && p.armRegionName === region && p.retailPrice !== null,
      )
      point[region] = h !== undefined ? (h.retailPrice as number) : undefined
    }
    return point
  })
}

function getChartDirection(points: (SkuHistoryPoint & { price: number })[]): string {
  const last = points[points.length - 1]
  if (!last) return 'new'
  if (last.direction === 'changed') {
    if (last.priceBefore !== undefined && last.price < last.priceBefore) return 'drop'
    if (last.priceBefore !== undefined && last.price > last.priceBefore) return 'increase'
  }
  return 'new'
}

interface SkuChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ value?: unknown }>
  label?: string | number
  data: ChartPoint[]
  unitOfMeasure: string
}

function SkuChartTooltip({ active, payload, label, data, unitOfMeasure }: SkuChartTooltipProps) {
  if (!active || !payload?.length || typeof label !== 'string' || !label) return null
  const raw = payload[0].value
  if (typeof raw !== 'number') return null
  const price = raw
  const idx = data.findIndex((p) => p.at === label)
  const prev = idx > 0 ? data[idx - 1].price : null
  const change =
    prev !== null
      ? (() => {
          const abs = price - prev
          const pct = prev !== 0 ? (abs / prev) * 100 : 0
          const sign = abs >= 0 ? '+' : ''
          return { text: `${sign}${formatPrice(abs)} (${sign}${pct.toFixed(1)}%)`, up: abs >= 0 }
        })()
      : null

  return (
    <div className="phc__tooltip">
      <div className="phc__tooltip-date">{formatDateFull(label)}</div>
      <div className="phc__tooltip-price">{formatPrice(price, unitOfMeasure)}</div>
      {change && (
        <div className={`phc__tooltip-change phc__tooltip-change--${change.up ? 'up' : 'down'}`}>
          {change.text}
        </div>
      )}
    </div>
  )
}

interface MultiRegionTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string | number | ((obj: unknown) => unknown); value?: unknown; color?: string }>
  label?: string | number
  unitOfMeasure: string
}

function MultiRegionTooltip({ active, payload, label, unitOfMeasure }: MultiRegionTooltipProps) {
  if (!active || !payload?.length || typeof label !== 'string' || !label) return null

  const entries = payload
    .filter((p) => typeof p.value === 'number' && typeof p.dataKey === 'string')
    .map((p) => ({ region: p.dataKey as string, price: p.value as number, color: p.color }))

  if (!entries.length) return null

  const cheapest = entries.slice().sort((a, b) => a.price - b.price)[0]

  return (
    <div className="phc__tooltip">
      <div className="phc__tooltip-date">{formatDateFull(label)}</div>
      {entries.map((e) => (
        <div key={e.region} className="phc__tooltip-price" style={{ color: e.color }}>
          {e.region}: {formatPrice(e.price, unitOfMeasure)}
        </div>
      ))}
      <div className="phc__tooltip-cheapest">
        Cheapest: {cheapest.region} @ {formatPrice(cheapest.price, unitOfMeasure)}
      </div>
interface MultiTooltipEntry {
  dataKey?: string | number | ((obj: unknown) => unknown)
  value?: unknown
  color?: string
}

interface MultiRegionTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<MultiTooltipEntry>
  label?: string | number
  perRegionData: Map<string, ChartPoint[]>
  entry: SkuEntry
}

function MultiRegionTooltip({ active, payload, label, perRegionData, entry }: MultiRegionTooltipProps) {
  if (!active || !payload?.length || typeof label !== 'string' || !label) return null
  return (
    <div className="phc__tooltip">
      <div className="phc__tooltip-date">{formatDateFull(label)}</div>
      {payload.map((item, i) => {
        const regionName = typeof item.dataKey === 'string' ? item.dataKey : undefined
        if (!regionName || typeof item.value !== 'number') return null
        const points = perRegionData.get(regionName) ?? []
        const idx = points.findIndex((p) => p.at === label)
        const prev = idx > 0 ? points[idx - 1].price : null
        const price = item.value
        const unitOfMeasure =
          entry.regions.find((r) => r.armRegionName === regionName)?.unitOfMeasure ?? ''
        const change =
          prev !== null
            ? (() => {
                const abs = price - prev
                const pct = prev !== 0 ? (abs / prev) * 100 : 0
                const sign = abs >= 0 ? '+' : ''
                return { text: `${sign}${formatPrice(abs)} (${sign}${pct.toFixed(1)}%)`, up: abs >= 0 }
              })()
            : null
        return (
          <div key={`${regionName}-${i}`} className="phc__tooltip-region-entry">
            <div className="phc__tooltip-region-name" style={{ color: item.color }}>
              {regionName}
            </div>
            <div className="phc__tooltip-price">{formatPrice(price, unitOfMeasure)}</div>
            {change && (
              <div
                className={`phc__tooltip-change phc__tooltip-change--${change.up ? 'up' : 'down'}`}
              >
                {change.text}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChartEmptyIcon() {
  return (
    <svg className="sku-page__empty-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="2" />
      <polyline points="8,28 16,20 22,24 32,12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="13" y1="32" x2="27" y2="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  )
}

interface HistoryProps {
  entry: SkuEntry
}

function SkuHistory({ entry }: HistoryProps) {
  const [compareMode, setCompareMode] = useState(false)

  const primaryRegion = entry.regions.slice().sort((a, b) => a.retailPrice - b.retailPrice)[0]
  if (!primaryRegion) return null
  const historyRegions = useMemo(
    () => [
      ...new Set(
        entry.history.filter((h) => h.retailPrice !== null).map((h) => h.armRegionName),
      ),
    ],
    [entry.history],
  )

  const defaultRegion = useMemo(() => {
    const withHistory = new Set(historyRegions)
    return (
      entry.regions
        .slice()
        .sort((a, b) => a.retailPrice - b.retailPrice)
        .find((r) => withHistory.has(r.armRegionName))?.armRegionName ??
      historyRegions[0] ??
      ''
    )
  }, [entry.regions, historyRegions])

  const [selectedRegions, setSelectedRegions] = useState<string[]>(() =>
    defaultRegion ? [defaultRegion] : historyRegions.slice(0, 1),
  )

  function toggleRegion(region: string) {
    setSelectedRegions((prev) => {
      if (prev.includes(region)) {
        return prev.length > 1 ? prev.filter((r) => r !== region) : prev
      }
      return [...prev, region]
    })
  }

  const regionColorMap = useMemo(() => {
    const map = new Map<string, string>()
    historyRegions.forEach((r, i) => map.set(r, REGION_COLORS[i % REGION_COLORS.length]))
    return map
  }, [historyRegions])

  const perRegionData = useMemo((): Map<string, ChartPoint[]> => {
    const map = new Map<string, ChartPoint[]>()
    for (const regionName of selectedRegions) {
      const points = entry.history
        .filter((h) => h.armRegionName === regionName && h.retailPrice !== null)
        .map((h) => ({ at: h.at, price: h.retailPrice as number }))
        .sort((a, b) => a.at.localeCompare(b.at))
      map.set(regionName, points)
    }
    return map
  }, [entry.history, selectedRegions])

  const isSingleRegion = selectedRegions.length === 1
  const primaryRegionName = selectedRegions[0] ?? ''
  const primaryRegion =
    entry.regions.find((r) => r.armRegionName === primaryRegionName) ?? entry.regions[0]
  const primaryPoints = perRegionData.get(primaryRegionName) ?? []

  const primaryDirectionHistory = useMemo(
    () =>
      entry.history
        .filter((h) => h.armRegionName === primaryRegionName && h.retailPrice !== null)
        .map((h) => ({ ...h, price: h.retailPrice as number }))
        .sort((a, b) => a.at.localeCompare(b.at)),
    [entry.history, primaryRegionName],
  )

  function getSeriesColor(regionName: string): string {
    if (isSingleRegion) return directionColor(getChartDirection(primaryDirectionHistory))
    return regionColorMap.get(regionName) ?? REGION_COLORS[0]
  }

  const mergedData = useMemo((): Array<Record<string, unknown>> => {
    const allAts = [
      ...new Set([...perRegionData.values()].flatMap((pts) => pts.map((p) => p.at))),
    ].sort()
    return allAts.map((at) => {
      const point: Record<string, unknown> = { at }
      for (const [regionName, pts] of perRegionData) {
        const match = pts.find((p) => p.at === at)
        if (match !== undefined) point[regionName] = match.price
      }
      return point
    })
  }, [perRegionData])

  const eligibleRegionNames = [
    ...new Set(
      entry.history
        .filter((h) => h.retailPrice !== null)
        .map((h) => h.armRegionName),
    ),
  ]
  const canCompare = eligibleRegionNames.length >= 2 && chartData.length >= 2

  const multiChartData: MultiPoint[] = compareMode
    ? buildMultiChartData(entry.history, eligibleRegionNames)
    : []

  const rangeMs =
    mergedData.length > 1
      ? new Date(mergedData[mergedData.length - 1].at as string).getTime() -
        new Date(mergedData[0].at as string).getTime()
      : 0

  const multiRangeMs =
    multiChartData.length > 1
      ? new Date(multiChartData[multiChartData.length - 1].at as string).getTime() -
        new Date(multiChartData[0].at as string).getTime()
      : rangeMs

  const color = directionColor(getChartDirection(regionPoints))
  const headingText =
    selectedRegions.length === 1 ? selectedRegions[0] : selectedRegions.join(' · ')

  const cheapestRegion = entry.regions.slice().sort((a, b) => a.retailPrice - b.retailPrice)[0]

  const historyHeading = compareMode
    ? `Price history · ${eligibleRegionNames.length} regions`
    : `Price history · ${primaryRegion.armRegionName}`

  return (
    <div className="sku-page__history">
      <h2 className="sku-page__history-heading">{historyHeading}</h2>
      <h2 className="sku-page__history-heading">Price history · {headingText}</h2>

      {historyRegions.length > 1 && (
        <div
          className="sku-page__region-selector"
          role="group"
          aria-label="Select regions"
        >
          {historyRegions.map((region) => (
            <button
              key={region}
              type="button"
              className={[
                'sku-page__region-btn',
                selectedRegions.includes(region) ? 'sku-page__region-btn--active' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => toggleRegion(region)}
              aria-pressed={selectedRegions.includes(region)}
            >
              {selectedRegions.includes(region) && (
                <span
                  className="sku-page__region-swatch"
                  style={{ background: regionColorMap.get(region) }}
                  aria-hidden="true"
                />
              )}
              {region}
            </button>
          ))}
        </div>
      )}

      {primaryPoints.length === 0 && (
        <div className="sku-page__empty" data-testid="sku-history-empty">
          <ChartEmptyIcon />
          <p className="sku-page__empty-headline">No price changes recorded yet</p>
          <p className="sku-page__empty-subline">Check back after the next data fetch</p>
        </div>
      )}

      {primaryPoints.length === 1 && (
        <div className="sku-page__single" data-testid="sku-history-single">
          <p
            className="sku-page__single-price"
            style={{ color: directionColor(getChartDirection(primaryDirectionHistory)) }}
          >
            {formatPrice(primaryPoints[0].price, primaryRegion?.unitOfMeasure ?? '')}
          </p>
          <dl className="sku-page__single-meta">
            <dt>Region</dt>
            <dd>{primaryRegionName}</dd>
            <dt>First seen</dt>
            <dd>{formatDateFull(primaryPoints[0].at)}</dd>
          </dl>
          <div className="sku-page__empty">
            <ChartEmptyIcon />
            <p className="sku-page__empty-headline">Not enough history yet</p>
            <p className="sku-page__empty-subline">Check back after the next data fetch</p>
          </div>
        </div>
      )}

      {chartData.length >= 2 && (
        <>
          {canCompare && (
            <div className="sku-page__compare-bar">
              <button
                className={`sku-page__compare-toggle${compareMode ? ' sku-page__compare-toggle--active' : ''}`}
                onClick={() => setCompareMode((m) => !m)}
                aria-pressed={compareMode}
              >
                {compareMode ? '← Single region' : 'Compare all regions'}
              </button>
            </div>
          )}
          <div className="sku-page__chart-container" data-testid="sku-history-chart">
            <ResponsiveContainer width="100%" height="100%">
              {compareMode ? (
                <AreaChart
                  data={multiChartData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" />
                  <XAxis
                    dataKey="at"
                    tickFormatter={(v: string) => formatDateAxis(v, multiRangeMs)}
                    tick={{ fill: '#93A4BE', fontSize: 13 }}
                    axisLine={{ stroke: '#1e2d47', strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatPrice(v)}
                    tick={{ fill: '#93A4BE', fontSize: 13 }}
                    axisLine={{ stroke: '#1e2d47', strokeWidth: 1 }}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip
                    content={(props) => (
                      <MultiRegionTooltip
                        {...props}
                        unitOfMeasure={primaryRegion.unitOfMeasure}
                      />
                    )}
                  />
                  {eligibleRegionNames.map((region, i) => (
                    <Area
                      key={region}
                      type="monotone"
                      dataKey={region}
                      stroke={COMPARISON_PALETTE[i % COMPARISON_PALETTE.length]}
                      strokeWidth={2}
                      fill={COMPARISON_PALETTE[i % COMPARISON_PALETTE.length]}
                      fillOpacity={0}
                      dot={false}
                      activeDot={{ r: 5, fill: COMPARISON_PALETTE[i % COMPARISON_PALETTE.length] }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  ))}
                </AreaChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" />
                  <XAxis
                    dataKey="at"
                    tickFormatter={(v: string) => formatDateAxis(v, rangeMs)}
                    tick={{ fill: '#93A4BE', fontSize: 13 }}
                    axisLine={{ stroke: '#1e2d47', strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatPrice(v)}
                    tick={{ fill: '#93A4BE', fontSize: 13 }}
                    axisLine={{ stroke: '#1e2d47', strokeWidth: 1 }}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip
                    content={(props) => (
                      <SkuChartTooltip
                        {...props}
                        data={chartData}
                        unitOfMeasure={primaryRegion.unitOfMeasure}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={color}
                    strokeWidth={2}
                    fill={color}
                    fillOpacity={0.12}
                    dot={false}
                    activeDot={{ r: 5, fill: color }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          {compareMode && cheapestRegion && (
            <div className="sku-page__cheapest-badge" data-testid="cheapest-badge">
              <span className="sku-page__cheapest-label">Cheapest now:</span>{' '}
              <span className="sku-page__cheapest-region">{cheapestRegion.armRegionName}</span>{' '}
              <span className="sku-page__cheapest-price">
                {formatPrice(cheapestRegion.retailPrice)} /{' '}
                {cheapestRegion.unitOfMeasure.toLowerCase().replace(/^1 /, '')}
              </span>
            </div>
          )}
        </>
      {primaryPoints.length >= 2 && (
        <div className="sku-page__chart-container" data-testid="sku-history-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mergedData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" />
              <XAxis
                dataKey="at"
                tickFormatter={(v: string) => formatDateAxis(v, rangeMs)}
                tick={{ fill: '#93A4BE', fontSize: 13 }}
                axisLine={{ stroke: '#1e2d47', strokeWidth: 1 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatPrice(v)}
                tick={{ fill: '#93A4BE', fontSize: 13 }}
                axisLine={{ stroke: '#1e2d47', strokeWidth: 1 }}
                tickLine={false}
                width={72}
              />
              <Tooltip
                content={
                  isSingleRegion
                    ? (props) => (
                        <SkuChartTooltip
                          {...props}
                          data={primaryPoints}
                          unitOfMeasure={primaryRegion?.unitOfMeasure ?? ''}
                        />
                      )
                    : (props) => (
                        <MultiRegionTooltip
                          {...props}
                          perRegionData={perRegionData}
                          entry={entry}
                        />
                      )
                }
              />
              {selectedRegions.map((regionName) => {
                const color = getSeriesColor(regionName)
                return (
                  <Area
                    key={regionName}
                    type="monotone"
                    dataKey={regionName}
                    stroke={color}
                    strokeWidth={2}
                    fill={color}
                    fillOpacity={isSingleRegion ? 0.12 : 0}
                    dot={false}
                    activeDot={{ r: 5, fill: color }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                )
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function SkuPage({ family }: Props) {
  const [index, setIndex] = useState<SkuIndex | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSkuIndex()
      .then(setIndex)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const entry: SkuEntry | null = index?.skus[family] ?? null

  useEffect(() => {
    if (!index) return
    const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`
    const canonicalUrl = `${baseUrl}#/sku/${encodeURIComponent(family)}`

    let title: string
    let ogDescription: string

    if (entry) {
      title = `${family} | Azure Pricing Radar`
      ogDescription = buildDescription(family, entry)
    } else {
      title = `Unknown SKU | Azure Pricing Radar`
      ogDescription = `${family} is not tracked by Azure Pricing Radar.`
    }

    const prevTitle = document.title
    const prevOgTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? ''
    const prevOgDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? ''
    const prevOgUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? ''

    document.title = title
    setMetaProperty('og:title', title)
    setMetaProperty('og:description', ogDescription)
    setMetaProperty('og:url', canonicalUrl)

    return () => {
      document.title = prevTitle
      setMetaProperty('og:title', prevOgTitle)
      setMetaProperty('og:description', prevOgDesc)
      setMetaProperty('og:url', prevOgUrl)
    }
  }, [index, entry, family])

  const homeUrl = import.meta.env.BASE_URL

  const header = (
    <header className="header">
      <div className="header__dot" />
      <a href={homeUrl} className="header__title sku-page__home-link">Azure Pricing Radar</a>
    </header>
  )

  if (loading) {
    return (
      <div className="app">
        {header}
        <main id="main-content" className="main">
          <div className="card sku-page__skeleton" aria-busy="true" aria-label="Loading SKU data" />
        </main>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="app">
        {header}
        <main id="main-content" className="main">
          <div className="card sku-page__state">
            <p className="sku-page__state-body">Failed to load SKU data. Please try again later.</p>
            <a href={homeUrl} className="sku-page__back">← Back to price changes</a>
          </div>
        </main>
      </div>
    )
  }

  if (!entry) {
    const issueTitle = encodeURIComponent(`Track SKU: ${family}`)
    const issueBody = encodeURIComponent(
      `I'd like Azure Pricing Radar to track the SKU **${family}**.\n\n` +
        `**Reason:** [explain why this SKU is important to you]\n\n` +
        `**Product family:** [e.g. Virtual Machines, Storage, etc.]`,
    )
    const issueUrl = `${REPO_URL}/issues/new?title=${issueTitle}&body=${issueBody}`

    return (
      <div className="app">
        {header}
        <main id="main-content" className="main">
          <div className="card sku-page__state">
            <svg
              className="sku-page__state-icon"
              aria-hidden="true"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
              <path d="M24 14v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="34" r="1.5" fill="currentColor" />
            </svg>
            <h1 className="sku-page__state-heading">We don&apos;t track this SKU yet</h1>
            <p className="sku-page__state-body">
              <code className="sku-page__family">{family}</code> is not in our current dataset. We
              track VM, storage, and AI SKUs across West Europe.
            </p>
            <div className="sku-page__offramp-actions">
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sku-page__request-btn"
              >
                Request tracking for this SKU
              </a>
              <a href={homeUrl} className="sku-page__back">← Back to price changes</a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {header}
      <main id="main-content" className="main">
        <div className="card">
          <a href={homeUrl} className="sku-page__back">← Back to price changes</a>
          <h1 className="sku-page__heading">{family}</h1>
          <p className="sku-page__product">{entry.productName}</p>
          <table className="sku-page__regions">
            <thead>
              <tr>
                <th>Region</th>
                <th>Price</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {entry.regions.map((r) => (
                <tr key={`${r.armRegionName}-${r.scope}`}>
                  <td>{r.armRegionName}</td>
                  <td className="sku-page__price">{formatPrice(r.retailPrice)}</td>
                  <td className="sku-page__unit">{r.unitOfMeasure}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <SkuHistory entry={entry} />
        </div>
      </main>
    </div>
  )
}
