import { useState, useEffect } from 'react'
import './App.css'
import { PriceChangesTable } from './components/PriceChangesTable'
import { PriceHistoryChart } from './components/PriceHistoryChart'
import { loadDiffs } from './lib/loadDiffs'
import type { TableRow } from './types'

export default function App() {
  const [rows, setRows] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null)

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
          <PriceChangesTable rows={rows} loading={loading} error={error} onRowClick={setSelectedRow} />
        </section>
      </main>
      {selectedRow && (
        <PriceHistoryChart row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  )
}
