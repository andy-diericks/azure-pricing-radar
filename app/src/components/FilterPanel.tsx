import type { ChangeDirection, TableRow } from '../types'
import type { FilterState } from '../lib/filters'
import './FilterPanel.css'

const ALL_DIRECTIONS: ChangeDirection[] = ['drop', 'increase', 'new', 'removed']
const DIRECTION_LABELS: Record<ChangeDirection, string> = {
  drop: 'Drop',
  increase: 'Increase',
  new: 'New SKU',
  removed: 'Removed',
}

interface Props {
  rows: TableRow[]
  filters: FilterState
  onChange: (filters: FilterState) => void
}

export function FilterPanel({ rows, filters, onChange }: Props) {
  if (rows.length === 0) return null

  const services = [...new Set(rows.map(r => r.scope))].sort()
  const regions = [...new Set(rows.map(r => r.armRegionName))].sort()

  function toggle<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
  }

  return (
    <div className="fp" role="group" aria-label="Filter price changes">
      {services.length > 1 && (
        <div className="fp__group">
          <span className="fp__label">Service</span>
          <div className="fp__checks">
            {services.map(s => (
              <label key={s} className="fp__check">
                <input
                  type="checkbox"
                  checked={filters.selectedServices.includes(s)}
                  onChange={() => onChange({ ...filters, selectedServices: toggle(filters.selectedServices, s) })}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {regions.length > 1 && (
        <div className="fp__group">
          <span className="fp__label">Region</span>
          <div className="fp__checks">
            {regions.map(r => (
              <label key={r} className="fp__check">
                <input
                  type="checkbox"
                  checked={filters.selectedRegions.includes(r)}
                  onChange={() => onChange({ ...filters, selectedRegions: toggle(filters.selectedRegions, r) })}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="fp__group">
        <span className="fp__label">Direction</span>
        <div className="fp__checks">
          {ALL_DIRECTIONS.map(d => (
            <label key={d} className={`fp__check fp__check--${d}`}>
              <input
                type="checkbox"
                checked={filters.selectedDirections.includes(d)}
                onChange={() =>
                  onChange({ ...filters, selectedDirections: toggle(filters.selectedDirections, d) })
                }
              />
              <span>{DIRECTION_LABELS[d]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="fp__group">
        <label htmlFor="fp-magnitude" className="fp__label">
          Min change&nbsp;
          <span className="fp__magnitude-val" aria-live="polite">
            ≥{filters.minMagnitude}%
          </span>
        </label>
        <input
          id="fp-magnitude"
          type="range"
          min={0}
          max={100}
          step={1}
          value={filters.minMagnitude}
          onChange={e => onChange({ ...filters, minMagnitude: Number(e.target.value) })}
          className="fp__slider"
          aria-label={`Minimum magnitude: ${filters.minMagnitude}%`}
        />
      </div>
    </div>
  )
}
