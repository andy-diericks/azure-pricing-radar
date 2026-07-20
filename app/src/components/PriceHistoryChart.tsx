import { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { loadHistory } from '../lib/loadHistory'
import type { HistoryPoint } from '../lib/loadHistory'
import type { TableRow } from '../types'
import { directionColor, formatDateAxis, formatDateFull, formatPrice } from '../lib/format'
import './PriceHistoryChart.css'

interface ChartPoint {
  at: string
  price: number
}

interface TooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ value?: unknown }>
  label?: string | number
  data: ChartPoint[]
  skuName: string
  scope: string
}

function ChartTooltip({ active, payload, label, data, skuName, scope }: TooltipProps) {
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
      <div className="phc__tooltip-sku">
        {skuName} · {scope}
      </div>
      <div className="phc__tooltip-price">{formatPrice(price)}</div>
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
    <svg className="phc__empty-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="2" />
      <polyline points="8,28 16,20 22,24 32,12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="13" y1="32" x2="27" y2="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  )
}

interface Props {
  row: TableRow
  onClose: () => void
}

export function PriceHistoryChart({ row, onClose }: Props) {
  const [points, setPoints] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    loadHistory(row.itemKey)
      .then(setPoints)
      .catch(() => setError('Unable to load price history. Please try again later.'))
      .finally(() => setLoading(false))
  }, [row.itemKey])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  const chartData: ChartPoint[] = points
    .filter((p): p is { at: string; price: number } => p.price !== null)
    .map((p) => ({ at: p.at, price: p.price }))

  const rangeMs =
    chartData.length > 1
      ? new Date(chartData[chartData.length - 1].at).getTime() -
        new Date(chartData[0].at).getTime()
      : 0

  const color = directionColor(row.direction)

  return (
    <div
      className="phc__overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Price history for ${row.skuName}`}
    >
      <div className="phc__card">
        <div className="phc__header">
          <div className="phc__title-block">
            <h3 className="phc__title">{row.skuName}</h3>
            <p className="phc__subtitle">
              {row.productName} · {row.armRegionName}
            </p>
          </div>
          <button ref={closeRef} className="phc__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="phc__body">
          {loading && <div className="phc__skeleton" aria-label="Loading chart" />}
          {error && <p className="phc__status phc__status--error">{error}</p>}
          {!loading && !error && chartData.length === 0 && (
            <div className="phc__empty">
              <ChartEmptyIcon />
              <p className="phc__empty-headline">Not enough history yet</p>
              <p className="phc__empty-subline">Check back after the next data fetch</p>
            </div>
          )}
          {!loading && !error && chartData.length === 1 && (
            <div className="phc__single">
              <p className="phc__single-price" style={{ color }}>
                {formatPrice(chartData[0].price, row.unitOfMeasure)}
              </p>
              <dl className="phc__single-meta">
                <dt>Product</dt>
                <dd>{row.productName}</dd>
                <dt>Region</dt>
                <dd>{row.armRegionName}</dd>
                <dt>First seen</dt>
                <dd>{formatDateFull(chartData[0].at)}</dd>
              </dl>
              <div className="phc__empty">
                <ChartEmptyIcon />
                <p className="phc__empty-headline">Not enough history yet</p>
                <p className="phc__empty-subline">Check back after the next data fetch</p>
              </div>
            </div>
          )}
          {!loading && !error && chartData.length >= 2 && (
            <div className="phc__chart-container">
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
                      <ChartTooltip
                        {...props}
                        data={chartData}
                        skuName={row.skuName}
                        scope={row.scope}
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
      </div>
    </div>
  )
}
