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
import './PriceHistoryChart.css'

function formatDate(at: string): string {
  const d = new Date(at)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function formatPrice(v: number): string {
  const s = v.toFixed(6).replace(/0+$/, '')
  const decimals = s.includes('.') ? s.length - s.indexOf('.') - 1 : 0
  return `$${decimals < 2 ? v.toFixed(2) : s}`
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

  useEffect(() => {
    loadHistory(row.itemKey)
      .then(setPoints)
      .catch((err: Error) => setError(err.message))
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

  const chartData = points
    .filter((p): p is { at: string; price: number } => p.price !== null)
    .map((p) => ({ at: formatDate(p.at), price: p.price }))

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
          <button className="phc__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="phc__body">
          {loading && <p className="phc__status">Loading…</p>}
          {error && <p className="phc__status phc__status--error">Error: {error}</p>}
          {!loading && !error && chartData.length === 0 && (
            <p className="phc__status">No price history available.</p>
          )}
          {!loading && !error && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" />
                <XAxis
                  dataKey="at"
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: '#1e2d47' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v}`}
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: '#1e2d47' }}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={(v: unknown) => [typeof v === 'number' ? formatPrice(v) : String(v), 'Price']}
                  labelFormatter={(l: unknown) => `Date: ${l}`}
                  contentStyle={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid #1e2d47',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-accent)', r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
