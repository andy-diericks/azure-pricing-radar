import './SearchInput.css'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: Props) {
  return (
    <div className="si">
      <svg className="si__icon" aria-hidden="true" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        className="si__input"
        type="search"
        placeholder="Search SKUs…"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Search SKUs"
      />
      {value && (
        <button
          className="si__clear"
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
    </div>
  )
}
