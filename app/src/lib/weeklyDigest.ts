import type { DigestData, DigestMover } from './digest'
import { formatDigestPrice } from './digest'

export interface WeeklySection {
  scope: string
  displayName: string
  drops: number
  increases: number
  newSkus: number
  removed: number
  topMovers: DigestMover[]
}

export interface WeeklyDigestData {
  isoWeek: string
  weekStart: string
  weekEnd: string
  daysWithData: number
  totalDrops: number
  totalIncreases: number
  totalNewSkus: number
  totalRemoved: number
  servicesAffected: string[]
  regionsAffected: string[]
  topMovers: DigestMover[]
  sections: WeeklySection[]
}

export function getIsoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function getIsoWeekBounds(isoWeek: string): { start: string; end: string } {
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

export function filterDigestsForWeek(digests: DigestData[], isoWeek: string): DigestData[] {
  const { start, end } = getIsoWeekBounds(isoWeek)
  return digests.filter((d) => d.date >= start && d.date <= end)
}

export function computeWeeklyDigest(isoWeek: string, digests: DigestData[]): WeeklyDigestData {
  const { start, end } = getIsoWeekBounds(isoWeek)

  let totalDrops = 0
  let totalIncreases = 0
  let totalNewSkus = 0
  let totalRemoved = 0

  const sectionMap = new Map<string, WeeklySection>()
  const allMovers: DigestMover[] = []
  const servicesSeen = new Set<string>()
  const regionsSeen = new Set<string>()

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
        sectionMap.set(section.scope, {
          scope: section.scope,
          displayName: section.displayName,
          drops: section.drops,
          increases: section.increases,
          newSkus: section.newSkus,
          removed: section.removed,
          topMovers: [...section.topMovers],
        })
      }

      if (section.drops + section.increases > 0) {
        servicesSeen.add(section.displayName)
      }
      for (const mover of section.topMovers) {
        allMovers.push(mover)
        regionsSeen.add(mover.regionDisplay)
      }
    }
  }

  const dedupeMovers = (movers: DigestMover[]): DigestMover[] => {
    const seen = new Map<string, DigestMover>()
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

  const sections: WeeklySection[] = Array.from(sectionMap.values()).map((s) => ({
    ...s,
    topMovers: dedupeMovers(s.topMovers).slice(0, 3),
  }))

  return {
    isoWeek,
    weekStart: start,
    weekEnd: end,
    daysWithData: digests.length,
    totalDrops,
    totalIncreases,
    totalNewSkus,
    totalRemoved,
    servicesAffected: Array.from(servicesSeen),
    regionsAffected: Array.from(regionsSeen),
    topMovers: dedupeMovers(allMovers).slice(0, 5),
    sections,
  }
}

export function renderWeeklyMarkdown(data: WeeklyDigestData): string {
  const { isoWeek, weekStart, weekEnd, totalDrops, totalIncreases, totalNewSkus, totalRemoved, sections } = data
  const lines: string[] = []

  lines.push(`# This week in Azure pricing: ${isoWeek} (${weekStart} – ${weekEnd})`)
  lines.push('')

  const summaryParts: string[] = []
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

    const sectionParts: string[] = []
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

    for (const mover of section.topMovers) {
      const sign = mover.pctChange < 0 ? '' : '+'
      const pct = `${sign}${mover.pctChange.toFixed(1)}%`
      const before = formatDigestPrice(mover.priceBefore, mover.unitOfMeasure)
      const after = formatDigestPrice(mover.priceAfter, mover.unitOfMeasure)
      lines.push(`- ${mover.skuName} (${mover.regionDisplay}): ${pct} — ${before} → ${after}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function renderWeeklyJson(data: WeeklyDigestData, generatedAt: string): string {
  return JSON.stringify({ generatedAt, ...data }, null, 2)
}
