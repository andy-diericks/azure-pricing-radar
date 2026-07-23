/**
 * Generate a daily digest of Azure pricing changes.
 *
 * Reads the most recent diff date in data/diffs/, produces:
 *   data/digests/<YYYY-MM-DD>.md
 *   data/digests/<YYYY-MM-DD>.json
 *
 * Called by fetch_prices.py after each run that detects changes.
 * Exported pure functions are tested via the TypeScript mirror in
 * app/src/lib/digest.ts.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = resolve(__dirname, '../data')

export const SCOPE_DISPLAY_NAMES = {
  'vm-eu-west': 'Virtual Machines · West Europe',
  'storage-eu-west': 'Storage · West Europe',
  'openai-eu': 'Azure OpenAI · EU',
}

export const REGION_DISPLAY_NAMES = {
  westeurope: 'West Europe',
  swedencentral: 'Sweden Central',
  francecentral: 'France Central',
  northeurope: 'North Europe',
}

/**
 * Compute signed percentage change.
 * Returns null when before is 0 (report as "from free" upstream).
 *
 * @param {number} before
 * @param {number} after
 * @returns {number | null}
 */
export function computePctChange(before, after) {
  if (before === 0) return null
  return ((after - before) / before) * 100
}

/**
 * Format a price with its unit for digest output.
 *
 * @param {number} price
 * @param {string} unit
 * @returns {string}  e.g. "$0.192/1 Hour"
 */
export function formatDigestPrice(price, unit) {
  let s = price.toFixed(6).replace(/0+$/, '')
  const dotIdx = s.indexOf('.')
  if (dotIdx === -1) {
    s += '.00'
  } else {
    const decimals = s.length - dotIdx - 1
    if (decimals < 2) s += '0'.repeat(2 - decimals)
  }
  return `$${s}/${unit}`
}

/**
 * Compute the structured digest data from an array of diff file contents.
 *
 * @param {string} date  YYYY-MM-DD
 * @param {Array<{scope: string, at: string, added?: any[], removed?: any[], changed?: any[]}>} diffFiles
 * @returns {DigestData}
 */
export function computeDigestData(date, diffFiles) {
  let totalDrops = 0
  let totalIncreases = 0
  let totalNewSkus = 0
  let totalRemoved = 0

  const sections = []

  for (const diff of diffFiles) {
    const { scope, added = [], removed = [], changed = [] } = diff
    const displayName = SCOPE_DISPLAY_NAMES[scope] ?? scope

    let drops = 0
    let increases = 0
    const movers = []

    for (const item of changed) {
      const pct = computePctChange(item.before.retailPrice, item.after.retailPrice)
      if (pct === null) continue
      const absPct = Math.abs(pct)
      if (absPct < 0.5) continue

      const direction = pct < 0 ? 'drop' : 'increase'
      if (direction === 'drop') drops++
      else increases++

      const armRegionName = item.after.armRegionName ?? item.before.armRegionName
      movers.push({
        skuName: item.after.skuName ?? item.before.skuName,
        productName: item.after.productName ?? item.before.productName,
        armRegionName,
        regionDisplay: REGION_DISPLAY_NAMES[armRegionName] ?? armRegionName,
        priceBefore: item.before.retailPrice,
        priceAfter: item.after.retailPrice,
        unitOfMeasure: item.after.unitOfMeasure ?? item.before.unitOfMeasure,
        pctChange: parseFloat(pct.toFixed(1)),
        direction,
      })
    }

    // Biggest |pct| first; drops before increases at equal magnitude
    movers.sort((a, b) => {
      const diff = Math.abs(b.pctChange) - Math.abs(a.pctChange)
      if (diff !== 0) return diff
      if (a.direction === 'drop' && b.direction !== 'drop') return -1
      if (b.direction === 'drop' && a.direction !== 'drop') return 1
      return 0
    })

    totalDrops += drops
    totalIncreases += increases
    totalNewSkus += added.length
    totalRemoved += removed.length

    sections.push({
      scope,
      displayName,
      drops,
      increases,
      newSkus: added.length,
      removed: removed.length,
      topMovers: movers.slice(0, 3),
    })
  }

  return { date, totalDrops, totalIncreases, totalNewSkus, totalRemoved, sections }
}

/**
 * Render digest data as Markdown.
 *
 * @param {{date: string, totalDrops: number, totalIncreases: number, totalNewSkus: number, totalRemoved: number, sections: any[]}} digestData
 * @returns {string}
 */
export function renderMarkdown(digestData) {
  const { date, totalDrops, totalIncreases, totalNewSkus, totalRemoved, sections } = digestData
  const lines = []

  lines.push(`# Azure pricing changes for ${date}`)
  lines.push('')

  const summaryParts = []
  if (totalDrops) summaryParts.push(`${totalDrops} price drop${totalDrops !== 1 ? 's' : ''}`)
  if (totalIncreases) summaryParts.push(`${totalIncreases} price increase${totalIncreases !== 1 ? 's' : ''}`)
  if (totalNewSkus) summaryParts.push(`${totalNewSkus.toLocaleString('en-US')} new SKU${totalNewSkus !== 1 ? 's' : ''}`)
  if (totalRemoved) summaryParts.push(`${totalRemoved} removed SKU${totalRemoved !== 1 ? 's' : ''}`)
  const summaryLine = summaryParts.length > 0 ? summaryParts.join(', ') : 'No changes detected'
  lines.push(`_${summaryLine}._`)
  lines.push('')

  for (const section of sections) {
    lines.push(`## ${section.displayName}`)
    lines.push('')

    const sectionParts = []
    if (section.drops) sectionParts.push(`${section.drops} drop${section.drops !== 1 ? 's' : ''}`)
    if (section.increases) sectionParts.push(`${section.increases} increase${section.increases !== 1 ? 's' : ''}`)
    if (section.newSkus) sectionParts.push(`${section.newSkus.toLocaleString('en-US')} new SKU${section.newSkus !== 1 ? 's' : ''}`)
    if (section.removed) sectionParts.push(`${section.removed} removed`)

    if (sectionParts.length === 0) {
      lines.push('_No changes detected._')
      lines.push('')
      continue
    }

    lines.push(`_${sectionParts.join(', ')}._`)
    lines.push('')

    if (section.topMovers.length > 0) {
      for (const mover of section.topMovers) {
        const sign = mover.pctChange < 0 ? '' : '+'
        const pct = `${sign}${mover.pctChange.toFixed(1)}%`
        const before = formatDigestPrice(mover.priceBefore, mover.unitOfMeasure)
        const after = formatDigestPrice(mover.priceAfter, mover.unitOfMeasure)
        lines.push(`- ${mover.skuName} (${mover.regionDisplay}): ${pct} — ${before} → ${after}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Render digest data as a JSON string.
 *
 * @param {object} digestData
 * @param {string} generatedAt  ISO timestamp
 * @returns {string}
 */
export function renderJson(digestData, generatedAt) {
  return JSON.stringify({ generatedAt, ...digestData }, null, 2)
}

function findLatestDiffDate(diffsDir) {
  if (!existsSync(diffsDir)) return null
  const dates = readdirSync(diffsDir)
    .filter(d => statSync(join(diffsDir, d)).isDirectory())
    .sort()
  return dates.length > 0 ? dates[dates.length - 1] : null
}

function readDiffFiles(diffsDir, date) {
  const dateDir = join(diffsDir, date)
  return readdirSync(dateDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => JSON.parse(readFileSync(join(dateDir, f), 'utf8')))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const diffsDir = join(DATA_DIR, 'diffs')
  const date = findLatestDiffDate(diffsDir)

  if (!date) {
    console.log('generate-digest: no diffs found, skipping')
    process.exit(0)
  }

  const diffFiles = readDiffFiles(diffsDir, date)
  const digestData = computeDigestData(date, diffFiles)
  const generatedAt = new Date().toISOString()

  const digestsDir = join(DATA_DIR, 'digests')
  mkdirSync(digestsDir, { recursive: true })

  writeFileSync(join(digestsDir, `${date}.md`), renderMarkdown(digestData))
  writeFileSync(join(digestsDir, `${date}.json`), renderJson(digestData, generatedAt))

  console.log(`generate-digest: wrote data/digests/${date}.md and ${date}.json`)
}
