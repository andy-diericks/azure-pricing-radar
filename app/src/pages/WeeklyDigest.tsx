import { useState, useEffect } from 'react'
import { loadDigests } from '../lib/loadDigests'
import {
  getIsoWeekLabel,
  filterDigestsForWeek,
  computeWeeklyDigest,
} from '../lib/weeklyDigest'
import type { WeeklyDigestData, WeeklySection } from '../lib/weeklyDigest'
import type { DigestMover } from '../lib/digest'
import './WeeklyDigest.css'

function formatWeekRange(start: string, end: string): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [sy, sm, sd] = start.split('-').map(Number)
  const [, em, ed] = end.split('-').map(Number)
  if (sm === em) {
    return `${sd}–${ed} ${MONTHS[sm - 1]} ${sy}`
  }
  return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]} ${sy}`
}

function MoverRow({ mover }: { mover: DigestMover }) {
  const sign = mover.pctChange < 0 ? '' : '+'
  const cls = `wd__mover-pct wd__mover-pct--${mover.direction}`
  return (
    <div className="wd__mover">
      <span className="wd__mover-sku">{mover.skuName}</span>
      <span className="wd__mover-region">{mover.regionDisplay}</span>
      <span className={cls}>{sign}{mover.pctChange.toFixed(1)}%</span>
    </div>
  )
}

function SectionCard({ section }: { section: WeeklySection }) {
  const hasCounts = section.drops + section.increases + section.newSkus + section.removed > 0
  return (
    <div className="wd__section">
      <h3 className="wd__section-name">{section.displayName}</h3>
      {hasCounts ? (
        <>
          <div className="wd__section-counts">
            {section.drops > 0 && (
              <span className="wd__count wd__count--drop">
                {section.drops} drop{section.drops !== 1 ? 's' : ''}
              </span>
            )}
            {section.increases > 0 && (
              <span className="wd__count wd__count--increase">
                {section.increases} increase{section.increases !== 1 ? 's' : ''}
              </span>
            )}
            {section.newSkus > 0 && (
              <span className="wd__count wd__count--new">
                {section.newSkus.toLocaleString('en-US')} new
              </span>
            )}
            {section.removed > 0 && (
              <span className="wd__count wd__count--removed">
                {section.removed} removed
              </span>
            )}
          </div>
          {section.topMovers.length > 0 && (
            <div className="wd__section-movers">
              {section.topMovers.map((m, i) => (
                <MoverRow key={`${m.skuName}-${m.armRegionName}-${i}`} mover={m} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="wd__section-none">No price changes this week.</p>
      )}
    </div>
  )
}

function WeeklySummaryCard({ data }: { data: WeeklyDigestData }) {
  const { totalDrops, totalIncreases, totalNewSkus, totalRemoved, servicesAffected, regionsAffected } = data
  return (
    <div className="wd__summary" data-testid="weekly-summary">
      <div className="wd__summary-grid">
        <div className="wd__stat">
          <span className="wd__stat-value wd__stat-value--drop">{totalDrops}</span>
          <span className="wd__stat-label">price drop{totalDrops !== 1 ? 's' : ''}</span>
        </div>
        <div className="wd__stat">
          <span className="wd__stat-value wd__stat-value--increase">{totalIncreases}</span>
          <span className="wd__stat-label">price increase{totalIncreases !== 1 ? 's' : ''}</span>
        </div>
        <div className="wd__stat">
          <span className="wd__stat-value">{totalNewSkus.toLocaleString('en-US')}</span>
          <span className="wd__stat-label">new SKU{totalNewSkus !== 1 ? 's' : ''}</span>
        </div>
        <div className="wd__stat">
          <span className="wd__stat-value">{totalRemoved}</span>
          <span className="wd__stat-label">removed</span>
        </div>
      </div>
      {(servicesAffected.length > 0 || regionsAffected.length > 0) && (
        <div className="wd__summary-meta">
          {servicesAffected.length > 0 && (
            <span className="wd__meta-item">
              <span className="wd__meta-label">Services: </span>
              {servicesAffected.join(', ')}
            </span>
          )}
          {regionsAffected.length > 0 && (
            <span className="wd__meta-item">
              <span className="wd__meta-label">Regions: </span>
              {regionsAffected.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SkeletonBlock() {
  return (
    <div className="wd__skeleton-block" aria-hidden="true">
      <div className="wd__skeleton wd__skeleton--title" />
      <div className="wd__skeleton wd__skeleton--body" />
      <div className="wd__skeleton wd__skeleton--body wd__skeleton--short" />
    </div>
  )
}

export function WeeklyDigest() {
  const [data, setData] = useState<WeeklyDigestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const isoWeek = getIsoWeekLabel(now)

    loadDigests()
      .then(({ entries }) => {
        const weekDigests = filterDigestsForWeek(entries, isoWeek)
        setData(computeWeeklyDigest(isoWeek, weekDigests))
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const weekLabel = data?.isoWeek ?? getIsoWeekLabel(new Date())
  const rangeLabel = data ? formatWeekRange(data.weekStart, data.weekEnd) : ''

  return (
    <div className="app">
      <a href="#wd-main" className="skip-link">Skip to main content</a>
      <header className="header">
        <div className="header__dot" />
        <a href="#/" className="header__title wd__home-link">Azure Pricing Radar</a>
        <span className="header__subtitle">Weekly rollup</span>
      </header>
      <main id="wd-main" className="main">
        <section className="card">
          <h1 className="card__heading">
            This week in Azure pricing
            {rangeLabel && <span className="wd__week-range">{rangeLabel}</span>}
          </h1>
          {loading && (
            <div aria-label="Loading weekly digest">
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
          )}
          {!loading && error && (
            <div className="wd__state">
              <p className="wd__state-heading">Failed to load weekly digest</p>
              <p className="wd__state-body">{error}</p>
            </div>
          )}
          {!loading && !error && data && data.daysWithData === 0 && (
            <div className="wd__state">
              <p className="wd__state-heading">No pricing data this week</p>
              <p className="wd__state-body">Daily digests publish when prices change. Check back tomorrow.</p>
            </div>
          )}
          {!loading && !error && data && data.daysWithData > 0 && (
            <>
              <WeeklySummaryCard data={data} />
              {data.topMovers.length > 0 && (
                <div className="wd__top-movers">
                  <h2 className="wd__section-heading">Biggest movers this week</h2>
                  <div className="wd__movers-list">
                    {data.topMovers.map((m, i) => (
                      <MoverRow key={`${m.skuName}-${m.armRegionName}-${i}`} mover={m} />
                    ))}
                  </div>
                </div>
              )}
              <div className="wd__sections">
                <h2 className="wd__section-heading">By service</h2>
                {data.sections.map((s) => (
                  <SectionCard key={s.scope} section={s} />
                ))}
              </div>
              <p className="wd__days-note">
                Based on {data.daysWithData} day{data.daysWithData !== 1 ? 's' : ''} of data ({weekLabel}).
              </p>
            </>
          )}
        </section>
        <p className="wd__archive-link">
          <a href="#/digests">View daily digest archive →</a>
        </p>
      </main>
    </div>
  )
}
