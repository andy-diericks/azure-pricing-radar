import { useEffect, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
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
            <p className="phc__status">No price history recorded for this SKU yet.</p>
          )}
          {!loading && !error && chartData.length > 0 && (
            <div className="phc__chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
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
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: color }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
