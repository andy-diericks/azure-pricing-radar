import type { ChangeDirection, TableRow } from '../types'
import type { FilterState } from '../lib/filters'
import { EMPTY_FILTERS } from '../lib/filters'
import './FilterPanel.css'

interface ActiveChip {
  key: string
  label: string
  onRemove: () => void
}

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

  const chips: ActiveChip[] = [
    ...filters.selectedServices.map(s => ({
      key: `service:${s}`,
      label: s,
      onRemove: () => onChange({ ...filters, selectedServices: filters.selectedServices.filter(x => x !== s) }),
    })),
    ...filters.selectedRegions.map(r => ({
      key: `region:${r}`,
      label: r,
      onRemove: () => onChange({ ...filters, selectedRegions: filters.selectedRegions.filter(x => x !== r) }),
    })),
    ...filters.selectedDirections.map(d => ({
      key: `direction:${d}`,
      label: DIRECTION_LABELS[d],
      onRemove: () => onChange({ ...filters, selectedDirections: filters.selectedDirections.filter(x => x !== d) }),
    })),
  ]
  if (filters.minMagnitude > 0) {
    chips.push({
      key: 'magnitude',
      label: `≥${filters.minMagnitude}% change`,
      onRemove: () => onChange({ ...filters, minMagnitude: 0 }),
    })
  }
  if (filters.searchTerm) {
    chips.push({
      key: 'search',
      label: `“${filters.searchTerm}”`,
      onRemove: () => onChange({ ...filters, searchTerm: '' }),
    })
  }

  return (
    <div className="fp" role="group" aria-label="Filter price changes">
      {chips.length > 0 && (
        <div className="fp__active">
          <span className="fp__active-label">Active</span>
          <div className="fp__chips">
            {chips.map(chip => (
              <button
                key={chip.key}
                type="button"
                className="fp__chip"
                onClick={chip.onRemove}
                aria-label={`Remove filter: ${chip.label}`}
              >
                <span>{chip.label}</span>
                <span className="fp__chip-x" aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fp__clear"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Clear all
          </button>
        </div>
      )}
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
