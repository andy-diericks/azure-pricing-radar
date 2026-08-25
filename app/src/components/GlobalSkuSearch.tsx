import { useState, useRef, useEffect, useMemo, useId } from 'react'
import { loadSkuFamilies, filterFamilies } from '../lib/loadSkuFamilies'
import type { SkuFamily } from '../lib/loadSkuFamilies'
import './GlobalSkuSearch.css'

interface Props {
  /** Injectable for tests; defaults to fetching the families file. */
  loader?: () => Promise<SkuFamily[]>
  /** Injectable for tests; defaults to hash navigation. */
  onSelect?: (family: string) => void
}

function defaultNavigate(family: string) {
  window.location.hash = `#/sku/${encodeURIComponent(family)}`
}

/**
 * Global SKU lookup: type any tracked SKU and jump straight to its price-history
 * page. Families are loaded lazily on first focus so the home page stays light.
 * Implements the ARIA combobox + listbox pattern with full keyboard support.
 */
export function GlobalSkuSearch({ loader = loadSkuFamilies, onSelect = defaultNavigate }: Props) {
  const [query, setQuery] = useState('')
  const [families, setFamilies] = useState<SkuFamily[] | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const requested = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  function ensureLoaded() {
    if (requested.current) return
    requested.current = true
    setLoadingList(true)
    loader()
      .then(setFamilies)
      .catch(() => setFamilies([]))
      .finally(() => setLoadingList(false))
  }

  const results = useMemo(
    () => (families ? filterFamilies(families, query) : []),
    [families, query],
  )

  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  // Close the listbox when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(family: string) {
    onSelect(family)
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault()
        choose(results[activeIndex].family)
      } else if (results.length === 1) {
        e.preventDefault()
        choose(results[0].family)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const showList = open && query.trim().length > 0
  const showNoMatch = showList && families !== null && !loadingList && results.length === 0

  return (
    <section className="gss" aria-labelledby="gss-label" ref={rootRef}>
      <label id="gss-label" className="gss__label" htmlFor="gss-input">
        Look up any SKU
      </label>
      <p className="gss__hint">Jump to the full price history of any tracked SKU.</p>
      <div className="gss__box">
        <svg className="gss__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id="gss-input"
          className="gss__input"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined
          }
          placeholder="e.g. Standard_D2s_v5"
          value={query}
          onFocus={() => {
            ensureLoaded()
            setOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      </div>
      {showList && (
        <ul className="gss__list" id={listId} role="listbox" aria-label="SKU matches">
          {loadingList && families === null && (
            <li className="gss__status" role="presentation">Loading SKUs…</li>
          )}
          {showNoMatch && (
            <li className="gss__status" role="presentation">No tracked SKU matches “{query.trim()}”.</li>
          )}
          {results.map((item, i) => (
            <li
              key={item.family}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`gss__opt${i === activeIndex ? ' gss__opt--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(item.family)
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="gss__opt-family">{item.family}</span>
              <span className="gss__opt-product">{item.productName}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
