import { useState, useEffect } from 'react'
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
  const primaryRegion = entry.regions.slice().sort((a, b) => a.retailPrice - b.retailPrice)[0]
  if (!primaryRegion) return null

  const regionPoints = entry.history
    .filter((h) => h.armRegionName === primaryRegion.armRegionName && h.retailPrice !== null)
    .map((h) => ({ ...h, price: h.retailPrice as number }))
    .sort((a, b) => a.at.localeCompare(b.at))

  const chartData: ChartPoint[] = regionPoints.map((p) => ({ at: p.at, price: p.price }))

  const rangeMs =
    chartData.length > 1
      ? new Date(chartData[chartData.length - 1].at).getTime() -
        new Date(chartData[0].at).getTime()
      : 0

  const color = directionColor(getChartDirection(regionPoints))

  return (
    <div className="sku-page__history">
      <h2 className="sku-page__history-heading">
        Price history · {primaryRegion.armRegionName}
      </h2>

      {chartData.length === 0 && (
        <div className="sku-page__empty" data-testid="sku-history-empty">
          <ChartEmptyIcon />
          <p className="sku-page__empty-headline">No price changes recorded yet</p>
          <p className="sku-page__empty-subline">Check back after the next data fetch</p>
        </div>
      )}

      {chartData.length === 1 && (
        <div className="sku-page__single" data-testid="sku-history-single">
          <p className="sku-page__single-price" style={{ color }}>
            {formatPrice(chartData[0].price, primaryRegion.unitOfMeasure)}
          </p>
          <dl className="sku-page__single-meta">
            <dt>Region</dt>
            <dd>{primaryRegion.armRegionName}</dd>
            <dt>First seen</dt>
            <dd>{formatDateFull(chartData[0].at)}</dd>
          </dl>
          <div className="sku-page__empty">
            <ChartEmptyIcon />
            <p className="sku-page__empty-headline">Not enough history yet</p>
            <p className="sku-page__empty-subline">Check back after the next data fetch</p>
          </div>
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="sku-page__chart-container" data-testid="sku-history-chart">
          <ResponsiveContainer width="100%" height="100%">
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
