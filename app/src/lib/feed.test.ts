import { describe, it, expect } from 'vitest'
import {
  escapeXml,
  formatRssDate,
  computeEntryText,
  renderAtom,
  renderRss,
  FEED_TITLE,
  SITE_URL,
  type DigestData,
  type FeedEntry,
} from './feed'

const makeDigest = (overrides: Partial<DigestData> = {}): DigestData => ({
  date: '2026-07-15',
  generatedAt: '2026-07-15T10:00:00.000Z',
  totalDrops: 0,
  totalIncreases: 0,
  totalNewSkus: 0,
  totalRemoved: 0,
  sections: [],
  ...overrides,
})

const makeEntry = (overrides: Partial<FeedEntry> = {}): FeedEntry => ({
  date: '2026-07-15',
  generatedAt: '2026-07-15T10:00:00.000Z',
  text: 'Azure pricing changes for 2026-07-15\n\nNo changes detected',
  ...overrides,
})

describe('escapeXml', () => {
  it('escapes ampersand', () => {
    expect(escapeXml('A & B')).toBe('A &amp; B')
  })

  it('escapes less-than and greater-than', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;')
  })

  it('escapes double quote', () => {
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;')
  })

  it('escapes single quote', () => {
    expect(escapeXml("it's")).toBe("it&apos;s")
  })

  it('returns unchanged string with no special chars', () => {
    expect(escapeXml('Standard_D2s_v5 West Europe')).toBe('Standard_D2s_v5 West Europe')
  })
})

describe('formatRssDate', () => {
  it('formats 2026-07-15 as correct RFC 822 day/month/year', () => {
    expect(formatRssDate('2026-07-15')).toBe('Wed, 15 Jul 2026 00:00:00 +0000')
  })

  it('pads single-digit day with leading zero', () => {
    expect(formatRssDate('2026-07-01')).toBe('Wed, 01 Jul 2026 00:00:00 +0000')
  })

  it('handles January correctly', () => {
    expect(formatRssDate('2026-01-01')).toBe('Thu, 01 Jan 2026 00:00:00 +0000')
  })
})

describe('computeEntryText', () => {
  it('shows "No changes detected" when all counts are zero', () => {
    const text = computeEntryText(makeDigest())
    expect(text).toContain('No changes detected')
    expect(text).toContain('Azure pricing changes for 2026-07-15')
  })

  it('includes drop and increase counts', () => {
    const text = computeEntryText(makeDigest({ totalDrops: 3, totalIncreases: 1 }))
    expect(text).toContain('3 price drops')
    expect(text).toContain('1 price increase')
  })

  it('includes new SKU count with locale formatting for large numbers', () => {
    const text = computeEntryText(makeDigest({ totalNewSkus: 9904 }))
    expect(text).toContain('9,904 new SKUs')
  })

  it('uses singular form for 1 drop', () => {
    const text = computeEntryText(makeDigest({ totalDrops: 1 }))
    expect(text).toContain('1 price drop')
    expect(text).not.toContain('1 price drops')
  })

  it('includes top movers from sections', () => {
    const digest = makeDigest({
      totalDrops: 1,
      sections: [
        {
          scope: 'vm-eu-west',
          displayName: 'Virtual Machines · West Europe',
          drops: 1,
          increases: 0,
          newSkus: 0,
          removed: 0,
          topMovers: [
            {
              skuName: 'Standard_D2s_v5',
              regionDisplay: 'West Europe',
              pctChange: -10.0,
              priceBefore: 0.096,
              priceAfter: 0.0864,
              unitOfMeasure: '1 Hour',
            },
          ],
        },
      ],
    })
    const text = computeEntryText(digest)
    expect(text).toContain('Virtual Machines · West Europe')
    expect(text).toContain('Standard_D2s_v5 (West Europe): -10.0%')
  })

  it('omits sections with no movers', () => {
    const digest = makeDigest({
      sections: [
        {
          scope: 'storage-eu-west',
          displayName: 'Storage · West Europe',
          drops: 0,
          increases: 0,
          newSkus: 5,
          removed: 0,
          topMovers: [],
        },
      ],
    })
    const text = computeEntryText(digest)
    expect(text).not.toContain('Storage · West Europe')
  })

  it('uses + prefix for increases', () => {
    const digest = makeDigest({
      totalIncreases: 1,
      sections: [
        {
          scope: 'vm-eu-west',
          displayName: 'Virtual Machines · West Europe',
          drops: 0,
          increases: 1,
          newSkus: 0,
          removed: 0,
          topMovers: [
            {
              skuName: 'Standard_E4s_v3',
              regionDisplay: 'West Europe',
              pctChange: 5.5,
              priceBefore: 0.2,
              priceAfter: 0.211,
              unitOfMeasure: '1 Hour',
            },
          ],
        },
      ],
    })
    const text = computeEntryText(digest)
    expect(text).toContain('+5.5%')
  })
})

describe('renderAtom', () => {
  it('starts with XML declaration', () => {
    const xml = renderAtom([makeEntry()], '2026-07-15')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('contains Atom feed element with correct namespace', () => {
    const xml = renderAtom([makeEntry()], '2026-07-15')
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
  })

  it('includes feed title', () => {
    const xml = renderAtom([makeEntry()], '2026-07-15')
    expect(xml).toContain(`<title>${FEED_TITLE}</title>`)
  })

  it('sets updated to date + T00:00:00Z when updatedDate provided', () => {
    const xml = renderAtom([makeEntry()], '2026-07-15')
    expect(xml).toContain('<updated>2026-07-15T00:00:00Z</updated>')
  })

  it('uses generatedAt as entry updated when available', () => {
    const xml = renderAtom([makeEntry({ generatedAt: '2026-07-15T10:00:00.000Z' })], '2026-07-15')
    expect(xml).toContain('<updated>2026-07-15T10:00:00.000Z</updated>')
  })

  it('includes entry with correct URL anchor', () => {
    const xml = renderAtom([makeEntry()], '2026-07-15')
    expect(xml).toContain(`${SITE_URL}/#/digests/2026-07-15`)
  })

  it('escapes special characters in entry content', () => {
    const xml = renderAtom([makeEntry({ text: 'Price: A & B → C' })], '2026-07-15')
    expect(xml).toContain('Price: A &amp; B → C')
  })

  it('handles null updatedDate gracefully', () => {
    const xml = renderAtom([], null)
    expect(xml).toContain('<updated>1970-01-01T00:00:00Z</updated>')
  })

  it('closes feed element', () => {
    const xml = renderAtom([makeEntry()], '2026-07-15')
    expect(xml.trim().endsWith('</feed>')).toBe(true)
  })
})

describe('renderRss', () => {
  it('starts with XML declaration', () => {
    const xml = renderRss([makeEntry()], '2026-07-15')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('contains rss version 2.0 element', () => {
    const xml = renderRss([makeEntry()], '2026-07-15')
    expect(xml).toContain('<rss version="2.0">')
  })

  it('includes feed title in channel', () => {
    const xml = renderRss([makeEntry()], '2026-07-15')
    expect(xml).toContain(`<title>${FEED_TITLE}</title>`)
  })

  it('formats lastBuildDate as RFC 822', () => {
    const xml = renderRss([makeEntry()], '2026-07-15')
    expect(xml).toContain('<lastBuildDate>Wed, 15 Jul 2026 00:00:00 +0000</lastBuildDate>')
  })

  it('includes item with pubDate', () => {
    const xml = renderRss([makeEntry()], '2026-07-15')
    expect(xml).toContain('<pubDate>Wed, 15 Jul 2026 00:00:00 +0000</pubDate>')
  })

  it('includes item guid matching the link', () => {
    const xml = renderRss([makeEntry()], '2026-07-15')
    const url = `${SITE_URL}/#/digests/2026-07-15`
    expect(xml).toContain(`<guid>${url}</guid>`)
    expect(xml).toContain(`<link>${url}</link>`)
  })

  it('escapes special characters in description', () => {
    const xml = renderRss([makeEntry({ text: 'A & B' })], '2026-07-15')
    expect(xml).toContain('<description>A &amp; B</description>')
  })

  it('closes rss element', () => {
    const xml = renderRss([makeEntry()], '2026-07-15')
    expect(xml.trim().endsWith('</rss>')).toBe(true)
  })
})
