import type { TableRow, DiffFile, DiffManifestEntry } from '../types'

const MAX_ROWS = 100

function diffToRows(diff: DiffFile): TableRow[] {
  const rows: TableRow[] = []
  const { scope, at } = diff

  for (const item of diff.added) {
    rows.push({
      key: `${scope}:added:${item.key}`,
      direction: 'new',
      scope,
      productName: item.productName,
      skuName: item.skuName,
      unitOfMeasure: item.unitOfMeasure,
      armRegionName: item.armRegionName,
      priceBefore: null,
      priceAfter: item.retailPrice,
      at,
    })
  }

  for (const item of diff.removed) {
    rows.push({
      key: `${scope}:removed:${item.key}`,
      direction: 'removed',
      scope,
      productName: item.productName,
      skuName: item.skuName,
      unitOfMeasure: item.unitOfMeasure,
      armRegionName: item.armRegionName,
      priceBefore: item.retailPrice,
      priceAfter: 0,
      at,
    })
  }

  for (const change of diff.changed) {
    const direction = change.after.retailPrice < change.before.retailPrice ? 'drop' : 'increase'
    rows.push({
      key: `${scope}:changed:${change.key}`,
      direction,
      scope,
      productName: change.after.productName,
      skuName: change.after.skuName,
      unitOfMeasure: change.after.unitOfMeasure,
      armRegionName: change.after.armRegionName,
      priceBefore: change.before.retailPrice,
      priceAfter: change.after.retailPrice,
      at,
    })
  }

  return rows
}

export async function loadDiffs(): Promise<TableRow[]> {
  const base = import.meta.env.BASE_URL
  const manifestRes = await fetch(`${base}data/diffs/manifest.json`)
  if (!manifestRes.ok) throw new Error(`Manifest fetch failed: ${manifestRes.status}`)
  const manifest: DiffManifestEntry[] = await manifestRes.json()

  if (manifest.length === 0) return []

  const dates = [...new Set(manifest.map((e) => e.date))].sort().reverse()
  const latestDate = dates[0]
  const latestEntries = manifest.filter((e) => e.date === latestDate)

  const diffs = await Promise.all(
    latestEntries.map(async (entry) => {
      const res = await fetch(`${base}data/${entry.path}`)
      if (!res.ok) return null
      return (await res.json()) as DiffFile
    }),
  )

  const allRows = diffs
    .filter((d): d is DiffFile => d !== null)
    .flatMap(diffToRows)

  // Prioritize actual changes (drop/increase) over new SKUs for the initial view
  const changes = allRows.filter((r) => r.direction === 'drop' || r.direction === 'increase')
  const newSkus = allRows.filter((r) => r.direction === 'new')
  const removed = allRows.filter((r) => r.direction === 'removed')

  return [...changes, ...removed, ...newSkus].slice(0, MAX_ROWS)
}
