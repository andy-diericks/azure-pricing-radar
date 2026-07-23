import { useState, useEffect, useMemo } from 'react'
import './App.css'
import { PriceChangesTable } from './components/PriceChangesTable'
import { LastUpdatedBadge } from './components/LastUpdatedBadge'
import { ChangesSummary } from './components/ChangesSummary'
import { FilterPanel } from './components/FilterPanel'
import { SearchInput } from './components/SearchInput'
import { BiggestMovers } from './components/BiggestMovers'
import { loadDiffs } from './lib/loadDiffs'
import { parseFiltersFromSearch, filtersToSearch, applyFilters } from './lib/filters'
import type { FilterState } from './lib/filters'
import type { TableRow } from './types'

export default function App() {
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(() =>
    parseFiltersFromSearch(window.location.search),
  )

  useEffect(() => {
    loadDiffs()
      .then(({ rows: r, lastUpdatedAt: ts, lastCheckedAt: checked }) => {
        setRows(r)
        setLastUpdatedAt(ts)
        setLastCheckedAt(checked)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleRowClick(row: TableRow) {
    window.location.hash = `#/sku/${encodeURIComponent(row.skuName)}`
  }

  function handleFiltersChange(next: FilterState) {
    setFilters(next)
    const search = filtersToSearch(next)
    history.replaceState(null, '', search || window.location.pathname)
  }

  function handleSearchChange(term: string) {
    handleFiltersChange({ ...filters, searchTerm: term })
  }

  const filteredRows = useMemo(() => applyFilters(rows, filters), [rows, filters])

  function handleMoverClick() {
    document.getElementById('price-changes-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="header">
        <div className="header__dot" />
        <span className="header__title">Azure Pricing Radar</span>
        <span className="header__subtitle">Price changes · checked every 6 hours</span>
        <a href="#/digests" className="header__nav-link">Digests</a>
        <LastUpdatedBadge lastUpdatedAt={lastUpdatedAt} lastCheckedAt={lastCheckedAt} />
      </header>
      <main id="main-content" className="main">
        <BiggestMovers rows={rows} loading={loading} onItemClick={handleMoverClick} />
        <section className="card" id="price-changes-card">
          <h2 className="card__heading">Recent price changes</h2>
          <SearchInput value={filters.searchTerm} onChange={handleSearchChange} />
          <FilterPanel rows={rows} filters={filters} onChange={handleFiltersChange} />
          <ChangesSummary rows={filteredRows} loading={loading} />
          <PriceChangesTable rows={filteredRows} loading={loading} error={error} onRowClick={handleRowClick} />
        </section>
      </main>
    </div>
  )
}
