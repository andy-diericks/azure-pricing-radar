import { useState, useMemo } from 'react'
import type { TableRow, ChangeDirection } from '../types'
import { formatPrice, formatPctChange } from '../lib/format'
import './PriceChangesTable.css'

const DIRECTION_LABELS: Record<ChangeDirection, string> = {
  new: '★ New',
  removed: '✕ Removed',
  drop: '▼ Drop',
  increase: '▲ Increase',
}

const DIRECTION_SR_LABELS: Record<ChangeDirection, string> = {
  new: 'new SKU',
  removed: 'removed SKU',
  drop: 'price drop',
  increase: 'price increase',
}

const DIRECTION_ORDER: Record<ChangeDirection, number> = {
  drop: 0,
  increase: 1,
  new: 2,
  removed: 3,
}

function rowAriaLabel(row: TableRow): string {
  const pct = formatPctChange(row.priceBefore, row.priceAfter, row.direction)
  const suffix = pct !== '—' ? ` ${pct}` : ''
  return `${row.skuName} · ${row.armRegionName} — ${DIRECTION_SR_LABELS[row.direction]}${suffix}`
}

type SortKey = 'direction' | 'pct' | 'sku' | 'product' | 'region' | 'before' | 'after'
type SortDir = 'asc' | 'desc'

function rawPctAbs(row: TableRow): number {
  if (row.priceBefore === null || row.priceBefore === 0) return 0
  return Math.abs(((row.priceAfter - row.priceBefore) / row.priceBefore) * 100)
}

function getSortValue(row: TableRow, key: Exclude<SortKey, 'before'>): number | string {
  switch (key) {
    case 'direction': return DIRECTION_ORDER[row.direction]
    case 'pct': return rawPctAbs(row)
    case 'sku': return row.skuName
    case 'product': return row.productName
    case 'region': return row.armRegionName
    case 'after': return row.priceAfter
  }
}

function sortRows(rows: TableRow[], key: SortKey, dir: SortDir): TableRow[] {
  return [...rows].sort((a, b) => {
    if (key === 'before') {
      if (a.priceBefore === null && b.priceBefore === null) {
        return DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction]
      }
      if (a.priceBefore === null) return 1
      if (b.priceBefore === null) return -1
      const diff = a.priceBefore - b.priceBefore
      const result = dir === 'desc' ? -diff : diff
      return result !== 0 ? result : DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction]
    }

    const av = getSortValue(a, key)
    const bv = getSortValue(b, key)

    const cmp =
      typeof av === 'string'
        ? (av as string).localeCompare(bv as string)
        : (av as number) - (bv as number)

    const result = dir === 'desc' ? -cmp : cmp
    return result !== 0 ? result : DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction]
  })
}

interface SortableHeaderProps {
  label: string
  colKey: SortKey
  activeKey: SortKey
  activeDir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}

function SortableHeader({ label, colKey, activeKey, activeDir, onSort, className }: SortableHeaderProps) {
  const isActive = activeKey === colKey
  return (
    <th
      scope="col"
      className={`pct__th--sortable${className ? ` ${className}` : ''}${isActive ? ' pct__th--active' : ''}`}
      tabIndex={0}
      onClick={() => onSort(colKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSort(colKey)
        }
      }}
      aria-sort={isActive ? (activeDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {isActive && (
        <span className="pct__sort-indicator" aria-hidden="true">
          {activeDir === 'asc' ? ' ↑' : ' ↓'}
        </span>
      )}
    </th>
  )
}

const SKELETON_COUNT = 6

function SkeletonRow() {
  return (
    <tr className="pct__skeleton-row" aria-hidden="true">
      <td><span className="pct__skeleton-cell pct__skeleton-cell--badge" /></td>
      <td><span className="pct__skeleton-cell pct__skeleton-cell--sku" /></td>
      <td><span className="pct__skeleton-cell pct__skeleton-cell--wide" /></td>
      <td><span className="pct__skeleton-cell" /></td>
      <td><span className="pct__skeleton-cell pct__skeleton-cell--num" /></td>
      <td><span className="pct__skeleton-cell pct__skeleton-cell--num" /></td>
      <td><span className="pct__skeleton-cell pct__skeleton-cell--num" /></td>
      <td><span className="pct__skeleton-cell" /></td>
    </tr>
  )
}

function SkeletonCard() {
  return (
    <li className="pct__card pct__card--skeleton" aria-hidden="true">
      <div className="pct__card-top">
        <span className="pct__skeleton-cell pct__skeleton-cell--badge" />
        <span className="pct__skeleton-cell pct__skeleton-cell--sku" />
      </div>
      <div className="pct__card-meta">
        <span className="pct__skeleton-cell pct__skeleton-cell--wide" />
        <span className="pct__skeleton-cell" />
      </div>
      <div className="pct__card-prices">
        <span className="pct__skeleton-cell pct__skeleton-cell--num" />
        <span className="pct__skeleton-cell pct__skeleton-cell--num" />
      </div>
    </li>
  )
}

function EmptyIcon() {
  return (
    <svg className="pct__state-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="16" x2="36" y2="16" stroke="currentColor" strokeWidth="2" />
      <line x1="13" y1="23" x2="27" y2="23" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="13" y1="28" x2="23" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="pct__state-icon pct__state-icon--error" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 6L36 34H4L20 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <line x1="20" y1="18" x2="20" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="30.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

interface Props {
  rows: TableRow[]
  loading?: boolean
  error?: string | null
  onRowClick?: (row: TableRow, element: HTMLElement) => void
}

export function PriceChangesTable({ rows, loading, error, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('pct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const displayRows = useMemo(() => sortRows(rows, sortKey, sortDir), [rows, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (loading) {
    return (
      <>
        <div className="pct__wrapper" data-testid="table-skeleton">
          <table className="pct" aria-label="Price changes" aria-busy="true">
            <thead>
              <tr>
                <th scope="col">Change</th>
                <th scope="col">SKU</th>
                <th scope="col">Product</th>
                <th scope="col">Region</th>
                <th scope="col" className="pct__num">Before</th>
                <th scope="col" className="pct__num">After</th>
                <th scope="col" className="pct__num">%</th>
                <th scope="col">Unit</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SKELETON_COUNT }, (_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
        <ul className="pct__cards pct__cards--skeleton" aria-label="Price changes" aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => <SkeletonCard key={i} />)}
        </ul>
      </>
    )
  }

  if (error) {
    return (
      <div className="pct__state">
        <ErrorIcon />
        <p className="pct__state-headline">Failed to load price changes</p>
        <p className="pct__state-subline">{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="pct__state">
        <EmptyIcon />
        <p className="pct__state-headline">No price changes detected</p>
        <p className="pct__state-subline">Check back after the next data fetch</p>
      </div>
    )
  }

  return (
    <>
      <div className="pct__wrapper">
        <table className="pct" aria-label="Price changes">
          <thead>
            <tr>
              <SortableHeader label="Change" colKey="direction" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} />
              <SortableHeader label="SKU" colKey="sku" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Product" colKey="product" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Region" colKey="region" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Before" colKey="before" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} className="pct__num" />
              <SortableHeader label="After" colKey="after" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} className="pct__num" />
              <SortableHeader label="%" colKey="pct" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} className="pct__num" />
              <th scope="col">Unit</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr
                key={row.key}
                className={`pct__row pct__row--${row.direction}${onRowClick ? ' pct__row--clickable' : ''}`}
                onClick={onRowClick ? (e) => onRowClick(row, e.currentTarget as HTMLElement) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          onRowClick(row, e.currentTarget as HTMLElement)
                      }
                    : undefined
                }
                aria-label={onRowClick ? rowAriaLabel(row) : undefined}
              >
                <td>
                  <span className={`pct__badge pct__badge--${row.direction}`} aria-hidden="true">
                    {DIRECTION_LABELS[row.direction]}
                  </span>
                  <span className="sr-only">{DIRECTION_SR_LABELS[row.direction]}</span>
                </td>
                <td className="pct__mono">{row.skuName}</td>
                <td>{row.productName}</td>
                <td>{row.armRegionName}</td>
                <td className="pct__num pct__mono">
                  {row.priceBefore !== null ? `${formatPrice(row.priceBefore)}` : '—'}
                </td>
                <td className="pct__num pct__mono">{`${formatPrice(row.priceAfter)}`}</td>
                <td className={`pct__num pct__mono pct__pct--${row.direction}`}>
                  {formatPctChange(row.priceBefore, row.priceAfter, row.direction)}
                </td>
                <td className="pct__secondary">{row.unitOfMeasure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="pct__cards" aria-label="Price changes">
        {displayRows.map((row) => (
          <li
            key={row.key}
            className={`pct__card pct__card--${row.direction}${onRowClick ? ' pct__card--clickable' : ''}`}
            onClick={onRowClick ? (e) => onRowClick(row, e.currentTarget as HTMLElement) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            role={onRowClick ? 'button' : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      onRowClick(row, e.currentTarget as HTMLElement)
                  }
                : undefined
            }
            aria-label={onRowClick ? rowAriaLabel(row) : undefined}
          >
            <div className="pct__card-top">
              <span className={`pct__badge pct__badge--${row.direction}`} aria-hidden="true">
                {DIRECTION_LABELS[row.direction]}
              </span>
              <span className="pct__card-sku pct__mono">{row.skuName}</span>
            </div>
            <div className="pct__card-meta">
              <span className="pct__card-product">{row.productName}</span>
              <span className="pct__secondary">{row.armRegionName}</span>
            </div>
            <div className="pct__card-prices">
              <span className="pct__mono pct__secondary">
                {row.priceBefore !== null ? `${formatPrice(row.priceBefore)}` : '—'}
              </span>
              <span className="pct__secondary" aria-hidden="true">→</span>
              <span className="pct__mono">{`${formatPrice(row.priceAfter)}`}</span>
              <span className={`pct__mono pct__pct--${row.direction}`}>
                {formatPctChange(row.priceBefore, row.priceAfter, row.direction)}
              </span>
              <span className="pct__secondary pct__card-unit">{row.unitOfMeasure}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
