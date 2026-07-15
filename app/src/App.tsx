import { useState, useEffect } from 'react'
import './App.css'
import { PriceChangesTable } from './components/PriceChangesTable'
import { loadDiffs } from './lib/loadDiffs'
import type { TableRow } from './types'

export default function App() {
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDiffs()
      .then(setRows)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="header__dot" />
        <span className="header__title">Azure Pricing Radar</span>
        <span className="header__subtitle">Real-time price change tracking</span>
      </header>
      <main className="main">
        <section className="card">
          <h2 className="card__heading">Recent price changes</h2>
          {loading && <p className="status-msg">Loading…</p>}
          {error && (
            <p className="status-msg status-msg--error">Failed to load data: {error}</p>
          )}
          {!loading && !error && <PriceChangesTable rows={rows} />}
        </section>
      </main>
    </div>
  )
}
