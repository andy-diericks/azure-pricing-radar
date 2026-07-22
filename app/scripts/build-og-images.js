/**
 * Build-time script: reads app/public/sku-index.json and emits SVG OG images
 * to app/public/og-images/<slug>.svg (one per SKU).
 *
 * Run via `npm run build` after build-sku-index.js. Can also be run directly
 * with `node scripts/build-og-images.js` from inside app/.
 *
 * Exported pure functions are tested in src/lib/ogImage.test.ts via the
 * TypeScript mirror in src/lib/ogImage.ts.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const SKU_INDEX_FILE = resolve(__dirname, '../public/sku-index.json')
const OUT_DIR = resolve(__dirname, '../public/og-images')

/**
 * Convert a SKU name to a safe filename slug.
 * @param {string} skuName
 * @returns {string}
 */
export function slugify(skuName) {
  return skuName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Format a price number as a dollar string with 2–6 significant decimals.
 * @param {number} value
 * @returns {string}
 */
function formatPrice(value) {
  const s = value.toFixed(6).replace(/0+$/, '')
  const decimals = s.includes('.') ? s.length - s.indexOf('.') - 1 : 0
  return decimals < 2 ? `$${value.toFixed(2)}` : `$${s}`
}

/**
 * Escape XML-special characters for safe SVG text embedding.
 * @param {string} s
 * @returns {string}
 */
function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Compute OG image data for a SKU entry.
 *
 * @param {{ regions: Array<{armRegionName: string, retailPrice: number, unitOfMeasure: string}>, history: Array<{at: string, armRegionName: string, retailPrice: number|null, direction: string, priceBefore?: number}> }} entry
 * @param {Date} [now]
 * @returns {{ currentPrice: number|null, unit: string, region: string|null, direction: 'drop'|'increase'|'stable'|null, pctChange: number|null }}
 */
export function computeOgData(entry, now) {
  now = now ?? new Date()
  const cheapest =
    entry.regions.length > 0
      ? entry.regions.slice().sort((a, b) => a.retailPrice - b.retailPrice)[0]
      : null

  const primaryRegion = cheapest?.armRegionName ?? ''

  const pricePoints = entry.history
    .filter((h) => h.armRegionName === primaryRegion && h.retailPrice !== null)
    .map((h) => ({ at: h.at, price: h.retailPrice }))
    .sort((a, b) => a.at.localeCompare(b.at))

  const cutoffMs = now.getTime() - 30 * 24 * 60 * 60 * 1000
  const inWindow = pricePoints.filter((p) => new Date(p.at).getTime() >= cutoffMs)

  let direction = null
  let pctChange = null

  if (inWindow.length >= 2) {
    const oldest = inWindow[0].price
    const newest = inWindow[inWindow.length - 1].price
    if (oldest === newest) {
      direction = 'stable'
      pctChange = 0
    } else {
      pctChange = ((newest - oldest) / oldest) * 100
      direction = newest < oldest ? 'drop' : 'increase'
    }
  }

  return {
    currentPrice: cheapest?.retailPrice ?? null,
    unit: cheapest?.unitOfMeasure ?? '',
    region: cheapest?.armRegionName ?? null,
    direction,
    pctChange,
  }
}

/**
 * Generate an SVG OG image string (1200×630 px) for a SKU.
 *
 * @param {string} skuName
 * @param {{ currentPrice: number|null, unit: string, region: string|null, direction: string|null, pctChange: number|null }} data
 * @returns {string}
 */
export function generateOgSvg(skuName, data) {
  const DIRECTION_COLORS = {
    drop: '#34D399',
    increase: '#F87171',
    stable: '#93A4BE',
  }

  const trendColor = data.direction ? (DIRECTION_COLORS[data.direction] ?? '#93A4BE') : '#93A4BE'

  // Adaptive font size: keep SKU name within 1080px usable width
  const fontSize = Math.max(22, Math.min(52, Math.floor(1080 / (skuName.length * 0.58))))

  let priceStr = 'Price unavailable'
  if (data.currentPrice !== null) {
    const unitPart = data.unit
      ? ` / ${data.unit.toLowerCase().replace(/^1\s+/, '')}`
      : ''
    priceStr = `${formatPrice(data.currentPrice)}${unitPart}`
  }

  let trendStr = 'No recent price changes'
  if (data.direction === 'drop' && data.pctChange !== null) {
    trendStr = `↓ ${Math.abs(data.pctChange).toFixed(1)}% (30-day drop)`
  } else if (data.direction === 'increase' && data.pctChange !== null) {
    trendStr = `↑ +${data.pctChange.toFixed(1)}% (30-day increase)`
  } else if (data.direction === 'stable') {
    trendStr = '→ No change (30-day)'
  }

  const regionStr = data.region ? `Cheapest region: ${data.region}` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B1120"/>
  <rect width="1200" height="4" fill="#38BDF8"/>
  <text x="60" y="76" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#38BDF8" font-weight="700">Azure Pricing Radar</text>
  <text x="60" y="200" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" fill="#E2E8F0" font-weight="700">${escapeXml(skuName)}</text>
  <text x="60" y="295" font-family="'Courier New',Courier,monospace" font-size="34" fill="#E2E8F0">${escapeXml(priceStr)}</text>
  <text x="60" y="375" font-family="system-ui,-apple-system,sans-serif" font-size="28" fill="${trendColor}">${escapeXml(trendStr)}</text>
  <text x="60" y="435" font-family="system-ui,-apple-system,sans-serif" font-size="20" fill="#93A4BE">${escapeXml(regionStr)}</text>
  <rect y="596" width="1200" height="2" fill="#1E293B"/>
  <text x="60" y="619" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#475569">azure-pricing-radar · Azure retail prices tracked automatically</text>
</svg>`
}

// Run only when invoked directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(SKU_INDEX_FILE)) {
    console.error('sku-index.json not found — run build-sku-index.js first')
    process.exit(1)
  }

  const { skus } = JSON.parse(readFileSync(SKU_INDEX_FILE, 'utf8'))
  mkdirSync(OUT_DIR, { recursive: true })

  let count = 0
  for (const [skuName, entry] of Object.entries(skus)) {
    const data = computeOgData(entry)
    const svg = generateOgSvg(skuName, data)
    const slug = slugify(skuName)
    writeFileSync(`${OUT_DIR}/${slug}.svg`, svg)
    count++
  }

  console.log(`og-images: ${count} SVG files written to ${OUT_DIR}`)
}
