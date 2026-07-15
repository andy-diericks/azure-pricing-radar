import type { TableRow, ChangeDirection } from '../types'
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
}

export function PriceChangesTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="pct__empty">No price changes detected in the latest fetch.</p>
  }

  return (
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
            <th scope="col">Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={`pct__row pct__row--${row.direction}`}>
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
              <td className="pct__secondary">{row.unitOfMeasure}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
