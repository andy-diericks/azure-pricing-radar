/**
 * Generates data/digests/YYYY-Www.json and .md for each ISO week that has
 * daily digest data but no weekly artifact yet.
 *
 * Run manually or from the data pipeline when a week boundary is crossed:
 *   node app/scripts/build-weekly-digest.js
 *
 * Human: wire into scripts/fetch_prices.py after merging E3.4.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
const DIGESTS_DIR = join(DATA_DIR, 'digests')

// ── ISO week helpers ──────────────────────────────────────────────────────────

function getIsoWeekLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getIsoWeekBounds(isoWeek) {
  const dashIdx = isoWeek.indexOf('-W')
  const year = parseInt(isoWeek.slice(0, dashIdx), 10)
  const week = parseInt(isoWeek.slice(dashIdx + 2), 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  }
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function dedupeMovers(movers) {
  const seen = new Map()
  for (const m of movers) {
    const key = `${m.skuName}|${m.armRegionName}`
    const prev = seen.get(key)
    if (!prev || Math.abs(m.pctChange) > Math.abs(prev.pctChange)) {
      seen.set(key, m)
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    const diff = Math.abs(b.pctChange) - Math.abs(a.pctChange)
    if (diff !== 0) return diff
    if (a.direction === 'drop' && b.direction !== 'drop') return -1
    if (b.direction === 'drop' && a.direction !== 'drop') return 1
    return 0
  })
}

function computeWeeklyDigest(isoWeek, digests) {
  const { start, end } = getIsoWeekBounds(isoWeek)
  let totalDrops = 0, totalIncreases = 0, totalNewSkus = 0, totalRemoved = 0
  const sectionMap = new Map()
  const allMovers = []
  const servicesSeen = new Set()
  const regionsSeen = new Set()

  for (const digest of digests) {
    totalDrops += digest.totalDrops
    totalIncreases += digest.totalIncreases
    totalNewSkus += digest.totalNewSkus
    totalRemoved += digest.totalRemoved

    for (const section of digest.sections) {
      const existing = sectionMap.get(section.scope)
      if (existing) {
        existing.drops += section.drops
        existing.increases += section.increases
        existing.newSkus += section.newSkus
        existing.removed += section.removed
        existing.topMovers.push(...section.topMovers)
      } else {
        sectionMap.set(section.scope, { ...section, topMovers: [...section.topMovers] })
      }
      if (section.drops + section.increases > 0) servicesSeen.add(section.displayName)
      for (const m of section.topMovers) {
        allMovers.push(m)
        regionsSeen.add(m.regionDisplay)
      }
    }
  }

  const sections = Array.from(sectionMap.values()).map((s) => ({
    ...s,
    topMovers: dedupeMovers(s.topMovers).slice(0, 3),
  }))

  return {
    isoWeek, weekStart: start, weekEnd: end,
    daysWithData: digests.length,
    totalDrops, totalIncreases, totalNewSkus, totalRemoved,
    servicesAffected: Array.from(servicesSeen),
    regionsAffected: Array.from(regionsSeen),
    topMovers: dedupeMovers(allMovers).slice(0, 5),
    sections,
  }
}

function renderMarkdown(data) {
  const { isoWeek, weekStart, weekEnd, totalDrops, totalIncreases, totalNewSkus, totalRemoved, sections } = data
  const lines = []
  lines.push(`# This week in Azure pricing: ${isoWeek} (${weekStart} – ${weekEnd})`)
  lines.push('')
  const parts = []
  if (totalDrops) parts.push(`${totalDrops} price drop${totalDrops !== 1 ? 's' : ''}`)
  if (totalIncreases) parts.push(`${totalIncreases} price increase${totalIncreases !== 1 ? 's' : ''}`)
  if (totalNewSkus) parts.push(`${totalNewSkus.toLocaleString('en-US')} new SKU${totalNewSkus !== 1 ? 's' : ''}`)
  if (totalRemoved) parts.push(`${totalRemoved} removed SKU${totalRemoved !== 1 ? 's' : ''}`)
  lines.push(`_${parts.length > 0 ? parts.join(', ') : 'No changes detected'}._`)
  lines.push('')
  for (const section of sections) {
    lines.push(`## ${section.displayName}`)
    lines.push('')
    const sp = []
    if (section.drops) sp.push(`${section.drops} drop${section.drops !== 1 ? 's' : ''}`)
    if (section.increases) sp.push(`${section.increases} increase${section.increases !== 1 ? 's' : ''}`)
    if (section.newSkus) sp.push(`${section.newSkus.toLocaleString('en-US')} new SKU${section.newSkus !== 1 ? 's' : ''}`)
    if (section.removed) sp.push(`${section.removed} removed`)
    if (sp.length === 0) { lines.push('_No changes detected._'); lines.push(''); continue }
    lines.push(`_${sp.join(', ')}._`)
    lines.push('')
    for (const m of section.topMovers) {
      const sign = m.pctChange < 0 ? '' : '+'
      const pct = `${sign}${m.pctChange.toFixed(1)}%`
      const fmt = (p, u) => {
        let s = p.toFixed(6).replace(/0+$/, '')
        if (!s.includes('.')) s += '.00'
        else { const d = s.length - s.indexOf('.') - 1; if (d < 2) s += '0'.repeat(2 - d) }
        return `$${s}/${u}`
      }
      lines.push(`- ${m.skuName} (${m.regionDisplay}): ${pct} — ${fmt(m.priceBefore, m.unitOfMeasure)} → ${fmt(m.priceAfter, m.unitOfMeasure)}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

const files = readdirSync(DIGESTS_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
const weekGroups = new Map()
for (const file of files) {
  const date = file.replace('.json', '')
  const week = getIsoWeekLabel(date)
  if (!weekGroups.has(week)) weekGroups.set(week, [])
  weekGroups.get(week).push(date)
}

let generated = 0
for (const [isoWeek, dates] of weekGroups) {
  const jsonPath = join(DIGESTS_DIR, `${isoWeek}.json`)
  if (existsSync(jsonPath)) {
    console.log(`build-weekly-digest: ${isoWeek} already exists, skipping`)
    continue
  }
  const digests = dates.map(d => JSON.parse(readFileSync(join(DIGESTS_DIR, `${d}.json`), 'utf8')))
  const data = computeWeeklyDigest(isoWeek, digests)
  const generatedAt = new Date().toISOString()
  writeFileSync(jsonPath, JSON.stringify({ generatedAt, ...data }, null, 2))
  writeFileSync(join(DIGESTS_DIR, `${isoWeek}.md`), renderMarkdown(data))
  console.log(`build-weekly-digest: generated ${isoWeek} (${dates.length} day(s))`)
  generated++
}

if (generated === 0) console.log('build-weekly-digest: nothing to generate')
