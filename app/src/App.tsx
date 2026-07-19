import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import './App.css'
import { PriceChangesTable } from './components/PriceChangesTable'
import { LastUpdatedBadge } from './components/LastUpdatedBadge'

const PriceHistoryChart = lazy(() =>
  import('./components/PriceHistoryChart').then(m => ({ default: m.PriceHistoryChart })),
)
import { loadDiffs } from './lib/loadDiffs'
import type { TableRow } from './types'

export default function App() {
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

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

  useEffect(() => {
    if (!selectedRow) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedRow(null)
        openerRef.current?.focus()
        openerRef.current = null
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedRow])

  function handleRowClick(row: TableRow, el: HTMLElement) {
    openerRef.current = el
    setSelectedRow(row)
  }

  function handleChartClose() {
    setSelectedRow(null)
    openerRef.current?.focus()
    openerRef.current = null
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__dot" />
        <span className="header__title">Azure Pricing Radar</span>
        <span className="header__subtitle">Price changes · checked every 6 hours</span>
        <LastUpdatedBadge lastUpdatedAt={lastUpdatedAt} lastCheckedAt={lastCheckedAt} />
      </header>
      <main className="main">
        <section className="card">
          <h2 className="card__heading">Recent price changes</h2>
          <PriceChangesTable rows={rows} loading={loading} error={error} onRowClick={handleRowClick} />
        </section>
      </main>
      {selectedRow && (
        <Suspense fallback={<div className="phc__lazy-fallback" aria-label="Loading chart" />}>
          <PriceHistoryChart row={selectedRow} onClose={handleChartClose} />
        </Suspense>
      )}
    </div>
  )
}
