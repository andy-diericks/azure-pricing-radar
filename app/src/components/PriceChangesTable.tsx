import type { TableRow, ChangeDirection } from '../types'
import { formatPctChange } from '../lib/format'
import './PriceChangesTable.css'

const DIRECTION_LABELS: Record<ChangeDirection, string> = {
  new: '★ New',
  removed: '✕ Removed',
  drop: '▼ Drop',
  increase: '▲ Increase',
}

function formatPrice(price: number): string {
  // Strip trailing zeros but always show at least 2 decimal places
  const s = price.toFixed(6).replace(/0+$/, '')
  const decimals = s.includes('.') ? s.length - s.indexOf('.') - 1 : 0
  return decimals < 2 ? price.toFixed(2) : s
}

interface Props {
  rows: TableRow[]
  onRowClick?: (row: TableRow) => void
}

export function PriceChangesTable({ rows, onRowClick }: Props) {
  if (rows.length === 0) {
    return <p className="pct__empty">No price changes detected in the latest fetch.</p>
  }

  return (
    <>
      <div className="pct__wrapper">
        <table className="pct" aria-label="Price changes">
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
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`pct__row pct__row--${row.direction}${onRowClick ? ' pct__row--clickable' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') onRowClick(row)
                      }
                    : undefined
                }
                aria-label={onRowClick ? `View price history for ${row.skuName}` : undefined}
              >
                <td>
                  <span className={`pct__badge pct__badge--${row.direction}`}>
                    {DIRECTION_LABELS[row.direction]}
                  </span>
                </td>
                <td className="pct__mono">{row.skuName}</td>
                <td>{row.productName}</td>
                <td>{row.armRegionName}</td>
                <td className="pct__num pct__mono">
                  {row.priceBefore !== null ? `$${formatPrice(row.priceBefore)}` : '—'}
                </td>
                <td className="pct__num pct__mono">{`$${formatPrice(row.priceAfter)}`}</td>
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
        {rows.map((row) => (
          <li
            key={row.key}
            className={`pct__card pct__card--${row.direction}${onRowClick ? ' pct__card--clickable' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') onRowClick(row)
                  }
                : undefined
            }
            aria-label={onRowClick ? `View price history for ${row.skuName}` : undefined}
          >
            <div className="pct__card-top">
              <span className={`pct__badge pct__badge--${row.direction}`}>
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
                {row.priceBefore !== null ? `$${formatPrice(row.priceBefore)}` : '—'}
              </span>
              <span className="pct__secondary" aria-hidden="true">→</span>
              <span className="pct__mono">{`$${formatPrice(row.priceAfter)}`}</span>
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
