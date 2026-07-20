import type { TableRow } from '../types'
import { formatPrice, formatPctChange } from '../lib/format'
import { computeMovers, WINDOW_7_MS, WINDOW_30_MS } from '../lib/movers'
import type { MoverItem, MoversResult } from '../lib/movers'
import './BiggestMovers.css'

interface MoverItemCardProps {
  item: MoverItem
  onClick?: () => void
}

function MoverItemCard({ item, onClick }: MoverItemCardProps) {
  const { row, pct } = item
  const pctStr = formatPctChange(row.priceBefore, row.priceAfter, row.direction)
  const dirClass = row.direction === 'drop' ? 'bm__item--drop' : 'bm__item--increase'

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      className={`bm__item ${onClick ? 'bm__item--clickable' : ''} ${dirClass}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${row.skuName} · ${row.armRegionName} — ${row.direction} ${pct.toFixed(1)}%`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <span className="bm__sku" title={row.skuName}>{row.skuName}</span>
      <span className="bm__region">{row.armRegionName}</span>
      <span className={`bm__pct bm__pct--${row.direction}`}>{pctStr}</span>
      <span className="bm__prices">
        {row.priceBefore !== null ? formatPrice(row.priceBefore) : '—'} → {formatPrice(row.priceAfter)}
      </span>
    </div>
  )
}

interface WindowSectionProps {
  label: string
  movers: MoversResult
  onItemClick?: (rowKey: string) => void
}

function WindowSection({ label, movers, onItemClick }: WindowSectionProps) {
  const hasDrops = movers.drops.length > 0
  const hasIncreases = movers.increases.length > 0

  return (
    <div className="bm__window">
      <h3 className="bm__window-title">{label}</h3>
      {!hasDrops && !hasIncreases ? (
        <p className="bm__empty">No price changes in this period</p>
      ) : (
        <div className="bm__groups">
          {hasDrops && (
            <div className="bm__group">
              <span className="bm__group-label bm__group-label--drop">▼ Biggest drops</span>
              {movers.drops.map(item => (
                <MoverItemCard
                  key={item.row.key}
                  item={item}
                  onClick={onItemClick ? () => onItemClick(item.row.key) : undefined}
                />
              ))}
            </div>
          )}
          {hasIncreases && (
            <div className="bm__group">
              <span className="bm__group-label bm__group-label--increase">▲ Biggest increases</span>
              {movers.increases.map(item => (
                <MoverItemCard
                  key={item.row.key}
                  item={item}
                  onClick={onItemClick ? () => onItemClick(item.row.key) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  rows: TableRow[]
  loading?: boolean
  onItemClick?: (rowKey: string) => void
  now?: number
}

export function BiggestMovers({ rows, loading = false, onItemClick, now }: Props) {
  const ts = now ?? Date.now()
  const movers7 = computeMovers(rows, WINDOW_7_MS, ts)
  const movers30 = computeMovers(rows, WINDOW_30_MS, ts)

  return (
    <section className="bm" aria-labelledby="bm-heading">
      <h2 className="bm__heading" id="bm-heading">Biggest movers</h2>
      {loading ? (
        <div className="bm__skeleton-wrap" aria-hidden="true">
          <div className="bm__skeleton-window">
            <div className="bm__skeleton bm__skeleton--title" />
            <div className="bm__skeleton-items">
              <div className="bm__skeleton bm__skeleton--item" />
              <div className="bm__skeleton bm__skeleton--item" />
              <div className="bm__skeleton bm__skeleton--item" />
            </div>
          </div>
          <div className="bm__skeleton-window">
            <div className="bm__skeleton bm__skeleton--title" />
            <div className="bm__skeleton-items">
              <div className="bm__skeleton bm__skeleton--item" />
              <div className="bm__skeleton bm__skeleton--item" />
              <div className="bm__skeleton bm__skeleton--item" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bm__windows">
          <WindowSection label="Last 7 days" movers={movers7} onItemClick={onItemClick} />
          <WindowSection label="Last 30 days" movers={movers30} onItemClick={onItemClick} />
        </div>
      )}
    </section>
  )
}
