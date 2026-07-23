export const SCOPE_DISPLAY_NAMES: Record<string, string> = {
  'vm-eu-west': 'Virtual Machines · West Europe',
  'storage-eu-west': 'Storage · West Europe',
  'openai-eu': 'Azure OpenAI · EU',
}

export const REGION_DISPLAY_NAMES: Record<string, string> = {
  westeurope: 'West Europe',
  swedencentral: 'Sweden Central',
  francecentral: 'France Central',
  northeurope: 'North Europe',
}

export interface DigestMover {
  skuName: string
  productName: string
  armRegionName: string
  regionDisplay: string
  priceBefore: number
  priceAfter: number
  unitOfMeasure: string
  pctChange: number
  direction: 'drop' | 'increase'
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
  totalDrops: number
  totalIncreases: number
  totalNewSkus: number
  totalRemoved: number
  sections: DigestSection[]
}

type DiffItem = {
  skuName: string
  productName: string
  retailPrice: number
  unitOfMeasure: string
  armRegionName: string
}

type ChangedEntry = {
  key: string
  before: DiffItem
  after: DiffItem
}

export type DiffFile = {
  scope: string
  at: string
  added?: DiffItem[]
  removed?: DiffItem[]
  changed?: ChangedEntry[]
}

export function computePctChange(before: number, after: number): number | null {
  if (before === 0) return null
  return ((after - before) / before) * 100
}

export function formatDigestPrice(price: number, unit: string): string {
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

export function computeDigestData(date: string, diffFiles: DiffFile[]): DigestData {
  let totalDrops = 0
  let totalIncreases = 0
  let totalNewSkus = 0
  let totalRemoved = 0

  const sections: DigestSection[] = []

  for (const diff of diffFiles) {
    const { scope, added = [], removed = [], changed = [] } = diff
    const displayName = SCOPE_DISPLAY_NAMES[scope] ?? scope

    let drops = 0
    let increases = 0
    const movers: DigestMover[] = []

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
        direction: direction as 'drop' | 'increase',
      })
    }

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

export function renderMarkdown(digestData: DigestData): string {
  const { date, totalDrops, totalIncreases, totalNewSkus, totalRemoved, sections } = digestData
  const lines: string[] = []

  lines.push(`# Azure pricing changes for ${date}`)
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

export function renderJson(digestData: DigestData, generatedAt: string): string {
  return JSON.stringify({ generatedAt, ...digestData }, null, 2)
}
