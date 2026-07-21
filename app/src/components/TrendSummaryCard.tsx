import { useMemo } from 'react'
import { computeTrendSummary } from '../lib/trendSummary'
import type { TrendWindow } from '../lib/trendSummary'
import { formatPrice, formatDateFull } from '../lib/format'
import type { SkuEntry } from '../lib/skuIndex'
import './TrendSummaryCard.css'

interface Props {
  entry: SkuEntry
  primaryRegion: string
}

function TrendBadge({ window: w }: { window: TrendWindow }) {
  if (w.status === 'insufficient') {
    return <span className="tsc__badge tsc__badge--neutral">Insufficient history</span>
  }
  if (w.status === 'stale') {
    return <span className="tsc__badge tsc__badge--neutral">Not yet determined</span>
  }
  if (w.direction === 'stable') {
    return <span className="tsc__badge tsc__badge--stable">Stable</span>
  }
  const pct = w.pctChange !== null ? Math.abs(w.pctChange).toFixed(1) : '0.0'
  const sign = w.direction === 'drop' ? '↓' : '↑'
  return (
    <span className={`tsc__badge tsc__badge--${w.direction}`}>
      {sign} {pct}%
    </span>
  )
}

export function TrendSummaryCard({ entry, primaryRegion }: Props) {
  const summary = useMemo(
    () => computeTrendSummary(entry, primaryRegion),
    [entry, primaryRegion],
  )

  return (
    <div className="tsc" data-testid="trend-summary-card">
      <h2 className="tsc__heading">Trend summary</h2>
      <div className="tsc__grid">
        <div className="tsc__stat">
          <span className="tsc__stat-label">30-day trend</span>
          <TrendBadge window={summary.thirtyDay} />
        </div>
        <div className="tsc__stat">
          <span className="tsc__stat-label">90-day trend</span>
          <TrendBadge window={summary.ninetyDay} />
        </div>
        <div className="tsc__stat">
          <span className="tsc__stat-label">First seen</span>
          <span className="tsc__stat-value">
            {summary.firstSeen ? formatDateFull(summary.firstSeen) : '—'}
          </span>
        </div>
        <div className="tsc__stat">
          <span className="tsc__stat-label">Price changes</span>
          <span className="tsc__stat-value tsc__stat-value--mono">{summary.changeCount}</span>
        </div>
        {summary.currentPrice !== null && (
          <div className="tsc__stat">
            <span className="tsc__stat-label">Current price</span>
            <span className="tsc__stat-value tsc__stat-value--mono">
              {formatPrice(summary.currentPrice, summary.unitOfMeasure)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
