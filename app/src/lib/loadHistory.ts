import type { DiffFile, DiffManifestEntry } from '../types'

export interface HistoryPoint {
  at: string
  price: number | null
}

export async function loadHistory(itemKey: string): Promise<HistoryPoint[]> {
  const base = import.meta.env.BASE_URL
  const manifestRes = await fetch(`${base}data/diffs/manifest.json`)
  if (!manifestRes.ok) throw new Error(`Manifest fetch failed: ${manifestRes.status}`)
  const manifest: DiffManifestEntry[] = await manifestRes.json()

  const diffs = (
    await Promise.all(
      manifest.map(async (entry) => {
        const res = await fetch(`${base}data/${entry.path}`)
        if (!res.ok) return null
        return (await res.json()) as DiffFile
      }),
    )
  )
    .filter((d): d is DiffFile => d !== null)
    .sort((a, b) => a.at.localeCompare(b.at))

  const points: HistoryPoint[] = []
  for (const diff of diffs) {
    const added = diff.added.find((item) => item.key === itemKey)
    if (added) {
      points.push({ at: diff.at, price: added.retailPrice })
      continue
    }
    const changed = diff.changed.find((item) => item.key === itemKey)
    if (changed) {
      points.push({ at: diff.at, price: changed.after.retailPrice })
      continue
    }
    if (diff.removed.find((item) => item.key === itemKey)) {
      points.push({ at: diff.at, price: null })
    }
  }

  return points
}
