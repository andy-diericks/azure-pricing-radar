/**
 * Generate Atom 1.0 and RSS 2.0 feeds from all digest JSON files.
 *
 * Reads data/digests/*.json (newest-first), produces:
 *   data/feed.atom   (Atom 1.0)
 *   data/feed.rss    (RSS 2.0)
 *
 * Called by fetch_prices.py after generate-digest.js when changes are detected.
 * Exported pure functions are tested via the TypeScript mirror in
 * app/src/lib/feed.ts.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = resolve(__dirname, '../data')

export const SITE_URL = 'https://andy-diericks.github.io/azure-pricing-radar'
export const FEED_TITLE = 'Azure Pricing Radar Daily Digest'
export const FEED_DESC = 'Daily digest of Azure retail price changes tracked by Azure Pricing Radar.'

/**
 * Escape special XML characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format a YYYY-MM-DD date string as RFC 822 for RSS <pubDate>.
 *
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {string}  e.g. "Tue, 15 Jul 2026 00:00:00 +0000"
 */
export function formatRssDate(dateStr) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = new Date(dateStr + 'T00:00:00Z')
  const dayName = days[d.getUTCDay()]
  const monthName = months[d.getUTCMonth()]
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dayName}, ${dd} ${monthName} ${yyyy} 00:00:00 +0000`
}

/**
 * Build a plain-text entry summary from digest data for use in feed content.
 *
 * @param {{date: string, totalDrops: number, totalIncreases: number, totalNewSkus: number, totalRemoved: number, sections: Array}} digestData
 * @returns {string}
 */
export function computeEntryText(digestData) {
  const { date, totalDrops, totalIncreases, totalNewSkus, totalRemoved, sections } = digestData
  const parts = []
  if (totalDrops) parts.push(`${totalDrops} price drop${totalDrops !== 1 ? 's' : ''}`)
  if (totalIncreases) parts.push(`${totalIncreases} price increase${totalIncreases !== 1 ? 's' : ''}`)
  if (totalNewSkus) parts.push(`${totalNewSkus.toLocaleString('en-US')} new SKU${totalNewSkus !== 1 ? 's' : ''}`)
  if (totalRemoved) parts.push(`${totalRemoved} removed`)
  const summary = parts.length > 0 ? parts.join(', ') : 'No changes detected'

  const lines = [`Azure pricing changes for ${date}`, '', summary]

  for (const section of sections) {
    const movers = section.topMovers ?? []
    if (movers.length === 0) continue
    lines.push('', section.displayName)
    for (const m of movers) {
      const sign = m.pctChange < 0 ? '' : '+'
      lines.push(
        `  ${m.skuName} (${m.regionDisplay}): ${sign}${m.pctChange.toFixed(1)}% — $${m.priceBefore.toFixed(2)} → $${m.priceAfter.toFixed(2)}/${m.unitOfMeasure}`,
      )
    }
  }

  return lines.join('\n').trim()
}

/**
 * Render an Atom 1.0 feed XML string.
 *
 * @param {Array<{date: string, generatedAt?: string|null, text: string}>} entries  Newest-first.
 * @param {string|null} updatedDate  YYYY-MM-DD of the most recent entry.
 * @returns {string}
 */
export function renderAtom(entries, updatedDate) {
  const updated = updatedDate ? updatedDate + 'T00:00:00Z' : '1970-01-01T00:00:00Z'

  const entryXml = entries.map(({ date, generatedAt, text }) => {
    const entryUrl = `${SITE_URL}/#/digests/${date}`
    const entryUpdated = generatedAt ?? date + 'T00:00:00Z'
    return [
      '  <entry>',
      `    <title>${escapeXml(`Azure pricing changes for ${date}`)}</title>`,
      `    <id>${escapeXml(entryUrl)}</id>`,
      `    <link href="${escapeXml(entryUrl)}"/>`,
      `    <updated>${entryUpdated}</updated>`,
      `    <content type="text">${escapeXml(text)}</content>`,
      '  </entry>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeXml(FEED_TITLE)}</title>`,
    `  <link href="${SITE_URL}/"/>`,
    `  <link rel="self" href="${SITE_URL}/feed.atom" type="application/atom+xml"/>`,
    `  <updated>${updated}</updated>`,
    `  <id>${SITE_URL}/</id>`,
    entryXml,
    '</feed>',
  ].join('\n')
}

/**
 * Render an RSS 2.0 feed XML string.
 *
 * @param {Array<{date: string, text: string}>} entries  Newest-first.
 * @param {string|null} updatedDate  YYYY-MM-DD of the most recent entry.
 * @returns {string}
 */
export function renderRss(entries, updatedDate) {
  const lastBuildDate = updatedDate ? formatRssDate(updatedDate) : formatRssDate('1970-01-01')

  const itemXml = entries.map(({ date, text }) => {
    const itemUrl = `${SITE_URL}/#/digests/${date}`
    const pubDate = formatRssDate(date)
    return [
      '    <item>',
      `      <title>${escapeXml(`Azure pricing changes for ${date}`)}</title>`,
      `      <link>${escapeXml(itemUrl)}</link>`,
      `      <guid>${escapeXml(itemUrl)}</guid>`,
      `      <pubDate>${pubDate}</pubDate>`,
      `      <description>${escapeXml(text)}</description>`,
      '    </item>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${SITE_URL}/</link>`,
    `    <description>${escapeXml(FEED_DESC)}</description>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    itemXml,
    '  </channel>',
    '</rss>',
  ].join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const digestsDir = join(DATA_DIR, 'digests')
  if (!existsSync(digestsDir)) {
    console.log('generate-feed: no digests directory, skipping')
    process.exit(0)
  }

  const digestFiles = readdirSync(digestsDir)
    .filter(f => f.endsWith('.json'))
    .sort()

  if (digestFiles.length === 0) {
    console.log('generate-feed: no digest files found, skipping')
    process.exit(0)
  }

  const entries = digestFiles
    .map(f => {
      const digestData = JSON.parse(readFileSync(join(digestsDir, f), 'utf8'))
      return {
        date: digestData.date,
        generatedAt: digestData.generatedAt ?? null,
        text: computeEntryText(digestData),
      }
    })
    .reverse() // newest first in the feed

  const updatedDate = entries[0].date

  writeFileSync(join(DATA_DIR, 'feed.atom'), renderAtom(entries, updatedDate))
  writeFileSync(join(DATA_DIR, 'feed.rss'), renderRss(entries, updatedDate))

  console.log(`generate-feed: wrote data/feed.atom and data/feed.rss (${entries.length} entries)`)
}
