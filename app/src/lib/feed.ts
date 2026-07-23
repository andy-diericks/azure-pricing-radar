export const SITE_URL = 'https://andy-diericks.github.io/azure-pricing-radar'
export const FEED_TITLE = 'Azure Pricing Radar Daily Digest'
export const FEED_DESC = 'Daily digest of Azure retail price changes tracked by Azure Pricing Radar.'

export interface DigestMover {
  skuName: string
  regionDisplay: string
  pctChange: number
  priceBefore: number
  priceAfter: number
  unitOfMeasure: string
}

export interface DigestSection {
  scope: string
  displayName: string
  drops: number
  increases: number
  newSkus: number
  removed: number
  topMovers: DigestMover[]
}

export interface DigestData {
  date: string
  generatedAt?: string | null
  totalDrops: number
  totalIncreases: number
  totalNewSkus: number
  totalRemoved: number
  sections: DigestSection[]
}

export interface FeedEntry {
  date: string
  generatedAt?: string | null
  text: string
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function formatRssDate(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = new Date(dateStr + 'T00:00:00Z')
  const dayName = days[d.getUTCDay()]
  const monthName = months[d.getUTCMonth()]
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dayName}, ${dd} ${monthName} ${yyyy} 00:00:00 +0000`
}

export function computeEntryText(digestData: DigestData): string {
  const { date, totalDrops, totalIncreases, totalNewSkus, totalRemoved, sections } = digestData
  const parts: string[] = []
  if (totalDrops) parts.push(`${totalDrops} price drop${totalDrops !== 1 ? 's' : ''}`)
  if (totalIncreases) parts.push(`${totalIncreases} price increase${totalIncreases !== 1 ? 's' : ''}`)
  if (totalNewSkus) parts.push(`${totalNewSkus.toLocaleString('en-US')} new SKU${totalNewSkus !== 1 ? 's' : ''}`)
  if (totalRemoved) parts.push(`${totalRemoved} removed`)
  const summary = parts.length > 0 ? parts.join(', ') : 'No changes detected'

  const lines: string[] = [`Azure pricing changes for ${date}`, '', summary]

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

export function renderAtom(entries: FeedEntry[], updatedDate: string | null): string {
  const updated = updatedDate ? updatedDate + 'T00:00:00Z' : '1970-01-01T00:00:00Z'

  const entryXml = entries
    .map(({ date, generatedAt, text }) => {
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
    })
    .join('\n')

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

export function renderRss(entries: FeedEntry[], updatedDate: string | null): string {
  const lastBuildDate = updatedDate ? formatRssDate(updatedDate) : formatRssDate('1970-01-01')

  const itemXml = entries
    .map(({ date, text }) => {
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
    })
    .join('\n')

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
