import type { DigestData } from './digest'

export interface DigestManifestEntry {
  date: string
  path: string
}

export interface LoadDigestsResult {
  entries: DigestData[]
}

export async function loadDigests(): Promise<LoadDigestsResult> {
  const base = import.meta.env.BASE_URL

  const manifestRes = await fetch(`${base}data/digests/manifest.json`)
  if (!manifestRes.ok) throw new Error(`Digest manifest fetch failed: ${manifestRes.status}`)

  const manifest = (await manifestRes.json()) as DigestManifestEntry[]

  if (manifest.length === 0) return { entries: [] }

  const results = await Promise.all(
    manifest.map(async (entry) => {
      const res = await fetch(`${base}data/${entry.path}`)
      if (!res.ok) return null
      return (await res.json()) as DigestData
    }),
  )

  const entries = results
    .filter((d): d is DigestData => d !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  return { entries }
}
