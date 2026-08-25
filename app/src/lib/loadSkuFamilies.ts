export interface SkuFamily {
  family: string
  productName: string
}

/**
 * Loads the compact family list (name + product) emitted by
 * scripts/build-sku-families.js. Small enough (~a few hundred KB) to fetch
 * on demand when the user first uses the global search — the full
 * sku-index.json is multi-megabyte and must never load just for lookup.
 */
export async function loadSkuFamilies(): Promise<SkuFamily[]> {
  const url = `${import.meta.env.BASE_URL}sku-families.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load SKU families (${res.status})`)
  const raw = (await res.json()) as Array<{ f: string; p: string }>
  return raw.map((r) => ({ family: r.f, productName: r.p }))
}

/**
 * Ranks families for a query: exact-ish prefix matches first, then substring
 * matches (family name preferred over product name). Case-insensitive.
 */
export function filterFamilies(families: SkuFamily[], query: string, limit = 8): SkuFamily[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored: Array<{ item: SkuFamily; score: number }> = []
  for (const item of families) {
    const fam = item.family.toLowerCase()
    const prod = item.productName.toLowerCase()
    let score = -1
    if (fam.startsWith(q)) score = 0
    else if (fam.includes(q)) score = 1
    else if (prod.includes(q)) score = 2
    if (score >= 0) scored.push({ item, score })
  }
  scored.sort((a, b) => a.score - b.score || a.item.family.localeCompare(b.item.family))
  return scored.slice(0, limit).map((s) => s.item)
}
