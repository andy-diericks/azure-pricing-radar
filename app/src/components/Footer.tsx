import './Footer.css'

const REPO_URL = 'https://github.com/andy-diericks/azure-pricing-radar'
const API_DOCS_URL =
  'https://learn.microsoft.com/rest/api/cost-management/retail-prices/azure-retail-prices'

/**
 * Site-wide footer establishing data provenance — the credibility this
 * product is built on. Kept to plain-language, verifiable claims (source,
 * cadence, currency, independence) per the product vision's "trustworthy data"
 * standard and ADR 0003's cadence wording ("checked every 6 hours").
 */
export function Footer() {
  return (
    <footer className="footer">
      <p className="footer__provenance">
        Price history built from the public{' '}
        <a href={API_DOCS_URL} target="_blank" rel="noopener noreferrer">
          Azure Retail Prices API
        </a>
        , checked every 6 hours. Prices shown in USD. An independent, open-data
        project — not affiliated with Microsoft.
      </p>
      <nav className="footer__links" aria-label="About this project">
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          Source &amp; open data on GitHub
        </a>
        <a
          href={`${REPO_URL}/blob/main/docs/api-notes.md`}
          target="_blank"
          rel="noopener noreferrer"
        >
          How the data works
        </a>
      </nav>
    </footer>
  )
}
