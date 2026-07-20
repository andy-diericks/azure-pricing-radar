import { useState, useEffect } from 'react'
import { loadSkuIndex } from '../lib/loadSkuIndex'
import { formatPrice } from '../lib/format'
import type { SkuEntry, SkuIndex } from '../lib/skuIndex'
import '../App.css'
import './SkuPage.css'

interface Props {
  family: string
}

const REPO_URL = 'https://github.com/andy-diericks/azure-pricing-radar'

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function buildDescription(family: string, entry: SkuEntry): string {
  const cheapest = entry.regions
    .slice()
    .sort((a, b) => a.retailPrice - b.retailPrice)[0]
  const priceStr = cheapest
    ? ` Current price from ${formatPrice(cheapest.retailPrice)}/${cheapest.unitOfMeasure.toLowerCase().replace(/^1 /, '')}.`
    : ''
  return `Azure retail pricing for ${family} (${entry.productName}).${priceStr}`
}

export function SkuPage({ family }: Props) {
  const [index, setIndex] = useState<SkuIndex | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSkuIndex()
      .then(setIndex)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const entry: SkuEntry | null = index?.skus[family] ?? null

  useEffect(() => {
    if (!index) return
    const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`
    const canonicalUrl = `${baseUrl}#/sku/${encodeURIComponent(family)}`

    let title: string
    let ogDescription: string

    if (entry) {
      title = `${family} | Azure Pricing Radar`
      ogDescription = buildDescription(family, entry)
    } else {
      title = `Unknown SKU | Azure Pricing Radar`
      ogDescription = `${family} is not tracked by Azure Pricing Radar.`
    }

    const prevTitle = document.title
    const prevOgTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? ''
    const prevOgDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? ''
    const prevOgUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? ''

    document.title = title
    setMetaProperty('og:title', title)
    setMetaProperty('og:description', ogDescription)
    setMetaProperty('og:url', canonicalUrl)

    return () => {
      document.title = prevTitle
      setMetaProperty('og:title', prevOgTitle)
      setMetaProperty('og:description', prevOgDesc)
      setMetaProperty('og:url', prevOgUrl)
    }
  }, [index, entry, family])

  const homeUrl = import.meta.env.BASE_URL

  const header = (
    <header className="header">
      <div className="header__dot" />
      <a href={homeUrl} className="header__title sku-page__home-link">Azure Pricing Radar</a>
    </header>
  )

  if (loading) {
    return (
      <div className="app">
        {header}
        <main id="main-content" className="main">
          <div className="card sku-page__skeleton" aria-busy="true" aria-label="Loading SKU data" />
        </main>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="app">
        {header}
        <main id="main-content" className="main">
          <div className="card sku-page__state">
            <p className="sku-page__state-body">Failed to load SKU data. Please try again later.</p>
            <a href={homeUrl} className="sku-page__back">← Back to price changes</a>
          </div>
        </main>
      </div>
    )
  }

  if (!entry) {
    const issueTitle = encodeURIComponent(`Track SKU: ${family}`)
    const issueBody = encodeURIComponent(
      `I'd like Azure Pricing Radar to track the SKU **${family}**.\n\n` +
        `**Reason:** [explain why this SKU is important to you]\n\n` +
        `**Product family:** [e.g. Virtual Machines, Storage, etc.]`,
    )
    const issueUrl = `${REPO_URL}/issues/new?title=${issueTitle}&body=${issueBody}`

    return (
      <div className="app">
        {header}
        <main id="main-content" className="main">
          <div className="card sku-page__state">
            <svg
              className="sku-page__state-icon"
              aria-hidden="true"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
              <path d="M24 14v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="34" r="1.5" fill="currentColor" />
            </svg>
            <h1 className="sku-page__state-heading">We don&apos;t track this SKU yet</h1>
            <p className="sku-page__state-body">
              <code className="sku-page__family">{family}</code> is not in our current dataset. We
              track VM, storage, and AI SKUs across West Europe.
            </p>
            <div className="sku-page__offramp-actions">
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sku-page__request-btn"
              >
                Request tracking for this SKU
              </a>
              <a href={homeUrl} className="sku-page__back">← Back to price changes</a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {header}
      <main id="main-content" className="main">
        <div className="card">
          <a href={homeUrl} className="sku-page__back">← Back to price changes</a>
          <h1 className="sku-page__heading">{family}</h1>
          <p className="sku-page__product">{entry.productName}</p>
          <table className="sku-page__regions">
            <thead>
              <tr>
                <th>Region</th>
                <th>Price</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {entry.regions.map((r) => (
                <tr key={`${r.armRegionName}-${r.scope}`}>
                  <td>{r.armRegionName}</td>
                  <td className="sku-page__price">{formatPrice(r.retailPrice)}</td>
                  <td className="sku-page__unit">{r.unitOfMeasure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
