// Build script: reads data/ and emits app/public/sku-index.json.
// Pure exports (toSlug, buildSkuIndex) are tested in src/lib/buildSkuIndex.test.ts.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Convert a skuName to a URL-safe slug (family key).
 * @param {string} skuName
 * @returns {string}
 */
export function toSlug(skuName) {
  return skuName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * @typedef {{ at: string; price: number | null }} HistoryPoint
 * @typedef {{ key: string; region: string; unit: string; price: number; history: HistoryPoint[] }} SkuItem
 * @typedef {{ skuName: string; productName: string; scope: string; regions: string[]; items: SkuItem[] }} SkuFamily
 * @typedef {{ generated: string; skus: Record<string, SkuFamily> }} SkuIndex
 *
 * @typedef {{ retailPrice: number; unitOfMeasure: string; productName: string; skuName: string; armRegionName: string }} LatestEntry
 * @typedef {{ scope: string; at: string; added: Array<LatestEntry & {key: string}>; removed: Array<{key: string; retailPrice: number}>; changed: Array<{key: string; before: {retailPrice: number}; after: {retailPrice: number}>} DiffEntry
 */

/**
 * Build a compact SKU index from parsed latest data and diff files.
 *
 * @param {Record<string, Record<string, LatestEntry>>} latestByScope
 *   Maps scope name to its latest.json content (key → price item).
 * @param {DiffEntry[]} diffs
 *   All diff records across all scopes and dates (any order).
 * @returns {SkuIndex}
 */
export function buildSkuIndex(latestByScope, diffs) {
  // Build per-key history by replaying diffs in chronological order.
  /** @type {Map<string, HistoryPoint[]>} */
  const historyMap = new Map()

  const sortedDiffs = [...diffs].sort((a, b) => a.at.localeCompare(b.at))

  for (const diff of sortedDiffs) {
    for (const item of diff.added) {
      if (!historyMap.has(item.key)) historyMap.set(item.key, [])
      historyMap.get(item.key).push({ at: diff.at, price: item.retailPrice })
    }
    for (const item of diff.removed) {
      if (!historyMap.has(item.key)) historyMap.set(item.key, [])
      historyMap.get(item.key).push({ at: diff.at, price: null })
    }
    for (const change of diff.changed) {
      if (!historyMap.has(change.key)) historyMap.set(change.key, [])
      historyMap.get(change.key).push({ at: diff.at, price: change.after.retailPrice })
    }
  }

  /** @type {Record<string, SkuFamily>} */
  const skus = {}
  /** @type {Map<string, Set<string>>} */
  const slugNames = new Map()

  for (const [scope, latest] of Object.entries(latestByScope)) {
    for (const [key, entry] of Object.entries(latest)) {
      const { retailPrice, unitOfMeasure, productName, skuName, armRegionName } = entry
      const slug = toSlug(skuName)

      if (!slugNames.has(slug)) slugNames.set(slug, new Set())
      slugNames.get(slug).add(skuName)

      if (!skus[slug]) {
        skus[slug] = { skuName, productName, scope, regions: [], items: [] }
      }

      const family = skus[slug]
      if (!family.regions.includes(armRegionName)) family.regions.push(armRegionName)

      family.items.push({
        key,
        region: armRegionName,
        unit: unitOfMeasure,
        price: retailPrice,
        history: historyMap.get(key) ?? [],
      })
    }
  }

  for (const [slug, names] of slugNames.entries()) {
    if (names.size > 1) {
      console.warn(`[sku-index] slug collision: "${slug}" → ${[...names].join(', ')}`)
    }
  }

  return { generated: new Date().toISOString(), skus }
}

function main() {
  const appDir = resolve(__dirname, '..')
  const dataDir = resolve(appDir, '..', 'data')
  const outputPath = resolve(appDir, 'public', 'sku-index.json')

  console.log('[sku-index] Reading data from', dataDir)

  // Read latest files (one per scope).
  const latestDir = join(dataDir, 'latest')
  /** @type {Record<string, Record<string, LatestEntry>>} */
  const latestByScope = {}

  for (const file of readdirSync(latestDir)) {
    if (!file.endsWith('.json') || file === 'last-checked.json') continue
    const scope = file.replace('.json', '')
    const raw = JSON.parse(readFileSync(join(latestDir, file), 'utf8'))
    // Skip empty or non-object files (e.g. openai-eu.json = {})
    if (typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length === 0) continue
    latestByScope[scope] = raw
  }

  // Read all diff files in chronological order.
  const diffsDir = join(dataDir, 'diffs')
  /** @type {DiffEntry[]} */
  const diffs = []

  if (existsSync(diffsDir)) {
    for (const dateDir of readdirSync(diffsDir).sort()) {
      const dateDirPath = join(diffsDir, dateDir)
      if (!statSync(dateDirPath).isDirectory()) continue
      for (const file of readdirSync(dateDirPath).sort()) {
        if (!file.endsWith('.json')) continue
        try {
          const diff = JSON.parse(readFileSync(join(dateDirPath, file), 'utf8'))
          diffs.push(diff)
        } catch (err) {
          console.warn(`[sku-index] Failed to parse ${file}:`, err.message)
        }
      }
    }
  }

  const scopeCount = Object.keys(latestByScope).length
  console.log(`[sku-index] Processing ${scopeCount} scope(s), ${diffs.length} diff file(s)`)

  const index = buildSkuIndex(latestByScope, diffs)
  const skuCount = Object.keys(index.skus).length
  const json = JSON.stringify(index)

  writeFileSync(outputPath, json)

  const sizeKB = Math.round(json.length / 1024)
  console.log(`[sku-index] Wrote ${skuCount} SKU families (${sizeKB} KB) → ${outputPath}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
