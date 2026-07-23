import { useState, useEffect } from 'react'
import { loadDigests } from '../lib/loadDigests'
import type { DigestData, DigestMover } from '../lib/digest'
import './DigestArchive.css'

function formatDigestDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${MONTHS[month - 1]} ${year}`
}

function buildHeadline(entry: DigestData): string {
  const parts: string[] = []
  if (entry.totalDrops) parts.push(`${entry.totalDrops} drop${entry.totalDrops !== 1 ? 's' : ''}`)
  if (entry.totalIncreases) parts.push(`${entry.totalIncreases} increase${entry.totalIncreases !== 1 ? 's' : ''}`)
  if (entry.totalNewSkus) parts.push(`${entry.totalNewSkus.toLocaleString('en-US')} new SKU${entry.totalNewSkus !== 1 ? 's' : ''}`)
  if (entry.totalRemoved) parts.push(`${entry.totalRemoved} removed`)
  return parts.length > 0 ? parts.join(' · ') : 'No changes detected'
}

function MoverBadge({ mover }: { mover: DigestMover }) {
  const sign = mover.pctChange < 0 ? '' : '+'
  const cls = `da__mover-pct da__mover-pct--${mover.direction}`
  return (
    <span className="da__mover">
      <span className="da__mover-sku">{mover.skuName}</span>
      <span className={cls}>{sign}{mover.pctChange.toFixed(1)}%</span>
    </span>
  )
}

function DigestEntry({ entry }: { entry: DigestData }) {
  const allMovers = entry.sections.flatMap((s) => s.topMovers)
  const topMovers = allMovers
    .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
    .slice(0, 3)

  return (
    <article className="da__entry">
      <div className="da__entry-header">
        <time className="da__entry-date" dateTime={entry.date}>
          {formatDigestDate(entry.date)}
        </time>
        <span className="da__entry-headline">{buildHeadline(entry)}</span>
      </div>
      <div className="da__entry-counts">
        {entry.totalDrops > 0 && (
          <span className="da__count da__count--drop">
            {entry.totalDrops} drop{entry.totalDrops !== 1 ? 's' : ''}
          </span>
        )}
        {entry.totalIncreases > 0 && (
          <span className="da__count da__count--increase">
            {entry.totalIncreases} increase{entry.totalIncreases !== 1 ? 's' : ''}
          </span>
        )}
        {entry.totalNewSkus > 0 && (
          <span className="da__count da__count--new">
            {entry.totalNewSkus.toLocaleString('en-US')} new
          </span>
        )}
        {entry.totalRemoved > 0 && (
          <span className="da__count da__count--removed">
            {entry.totalRemoved} removed
          </span>
        )}
      </div>
      {topMovers.length > 0 && (
        <div className="da__movers">
          {topMovers.map((m, i) => (
            <MoverBadge key={`${m.skuName}-${i}`} mover={m} />
          ))}
        </div>
      )}
    </article>
  )
}

function SkeletonEntry() {
  return (
    <div className="da__entry da__entry--skeleton" aria-hidden="true">
      <div className="da__skeleton da__skeleton--date" />
      <div className="da__skeleton da__skeleton--headline" />
      <div className="da__skeleton da__skeleton--counts" />
    </div>
  )
}

export function DigestArchive() {
  const [entries, setEntries] = useState<DigestData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDigests()
      .then(({ entries: e }) => setEntries(e))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app">
      <a href="#da-main" className="skip-link">Skip to main content</a>
      <header className="header">
        <div className="header__dot" />
        <a href="#/" className="header__title da__home-link">Azure Pricing Radar</a>
        <span className="header__subtitle">Daily digest archive</span>
      </header>
      <main id="da-main" className="main">
        <section className="card">
          <h1 className="card__heading">Daily digests</h1>
          {loading && (
            <div className="da__list" aria-label="Loading digests">
              <SkeletonEntry />
              <SkeletonEntry />
              <SkeletonEntry />
            </div>
          )}
          {!loading && error && (
            <div className="da__state">
              <p className="da__state-heading">Failed to load digests</p>
              <p className="da__state-body">{error}</p>
            </div>
          )}
          {!loading && !error && entries.length === 0 && (
            <div className="da__state">
              <p className="da__state-heading">No digests yet</p>
              <p className="da__state-body">Check back after the next data fetch.</p>
            </div>
          )}
          {!loading && !error && entries.length > 0 && (
            <ul className="da__list" aria-label="Digest entries">
              {entries.map((entry) => (
                <li key={entry.date}>
                  <DigestEntry entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
