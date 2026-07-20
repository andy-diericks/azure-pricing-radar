/**
 * Build-time script: reads data/ and emits app/public/sku-index.json.
 *
 * Run via `npm run build` (wired as a prebuild step). Can also be run
 * directly with `node scripts/build-sku-index.js` from inside app/.
 *
 * Exported pure functions are tested in src/lib/skuIndex.test.ts via
 * the TypeScript mirror in src/lib/skuIndex.ts.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
const OUT_FILE = resolve(__dirname, '../public/sku-index.json')

const SCOPES = ['vm-eu-west', 'storage-eu-west', 'openai-eu']

/**
 * Aggregate latest price data and diff history into a per-SKU index.
 *
 * @param {Array<{scope: string, data: Record<string, {skuName: string, productName: string, retailPrice: number, unitOfMeasure: string, armRegionName: string}>}>} latestEntries
 * @param {Array<{at: string, added?: any[], removed?: any[], changed?: any[]}>} diffEntries  Sorted chronologically oldest-first.
 * @returns {Record<string, {productName: string, regions: any[], history: any[]}>}
 */
export function aggregateSkuIndex(latestEntries, diffEntries) {
  /** @type {Record<string, {productName: string, regions: any[], history: any[]}>} */
  const skus = {}

  // Build index from current state (latest/ files)
  for (const { scope, data } of latestEntries) {
    for (const entry of Object.values(data)) {
      const { skuName, productName, retailPrice, unitOfMeasure, armRegionName } = entry
      if (!skus[skuName]) {
        skus[skuName] = { productName, regions: [], history: [] }
      }
      skus[skuName].regions.push({ armRegionName, scope, retailPrice, unitOfMeasure })
    }
  }

  // Overlay price history from diff files (chronological order)
  for (const { at, added, removed, changed } of diffEntries) {
    for (const item of added ?? []) {
      const sku = skus[item.skuName]
      if (sku) {
        sku.history.push({ at, armRegionName: item.armRegionName, retailPrice: item.retailPrice, direction: 'added' })
      }
    }
    for (const item of removed ?? []) {
      const sku = skus[item.skuName]
      if (sku) {
        sku.history.push({ at, armRegionName: item.armRegionName, retailPrice: null, direction: 'removed' })
      }
    }
    for (const item of changed ?? []) {
      const sku = skus[item.after.skuName]
      if (sku) {
        sku.history.push({
          at,
          armRegionName: item.after.armRegionName,
          retailPrice: item.after.retailPrice,
          priceBefore: item.before.retailPrice,
          direction: 'changed',
        })
      }
    }
  }

  return skus
}

function readLatestEntries() {
  const latestDir = join(DATA_DIR, 'latest')
  const entries = []
  for (const scope of SCOPES) {
    const filePath = join(latestDir, `${scope}.json`)
    if (!existsSync(filePath)) continue
    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
      entries.push({ scope, data })
    }
  }
  return entries
}

function readDiffEntries() {
  const diffsDir = join(DATA_DIR, 'diffs')
  if (!existsSync(diffsDir)) return []
  const entries = []
  for (const dateDir of readdirSync(diffsDir).sort()) {
    const dateDirPath = join(diffsDir, dateDir)
    if (!statSync(dateDirPath).isDirectory()) continue
    for (const file of readdirSync(dateDirPath).sort()) {
      if (!file.endsWith('.json')) continue
      const content = JSON.parse(readFileSync(join(dateDirPath, file), 'utf8'))
      entries.push(content)
    }
  }
  return entries
}

// Run only when invoked directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const latestEntries = readLatestEntries()
  const diffEntries = readDiffEntries()
  const skus = aggregateSkuIndex(latestEntries, diffEntries)
  const output = { generatedAt: new Date().toISOString(), skus }
  writeFileSync(OUT_FILE, JSON.stringify(output))
  console.log(`sku-index.json: ${Object.keys(skus).length} SKUs written to ${OUT_FILE}`)
}
