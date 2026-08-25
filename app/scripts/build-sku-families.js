/**
 * Build-time script: reads app/public/sku-index.json and emits a compact
 * app/public/sku-families.json — just the family name + product name for
 * every tracked SKU. This lets the global SKU search autocomplete over all
 * families without downloading the multi-megabyte full index.
 *
 * Runs in the build chain immediately after build-sku-index.js. Can also be
 * run directly with `node scripts/build-sku-families.js` from inside app/.
 *
 * Output shape: [{ "f": "<family>", "p": "<productName>" }, ...] sorted by f.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const IN_FILE = resolve(__dirname, '../public/sku-index.json')
const OUT_FILE = resolve(__dirname, '../public/sku-families.json')

export function toFamilies(index) {
  const skus = index && index.skus ? index.skus : {}
  return Object.entries(skus)
    .map(([family, entry]) => ({ f: family, p: entry.productName ?? '' }))
    .sort((a, b) => a.f.localeCompare(b.f))
}

function main() {
  if (!existsSync(IN_FILE)) {
    // The full index is a prerequisite; build-sku-index.js runs before this.
    console.warn(`build-sku-families: ${IN_FILE} not found — writing empty list.`)
    writeFileSync(OUT_FILE, '[]')
    return
  }
  const index = JSON.parse(readFileSync(IN_FILE, 'utf8'))
  const families = toFamilies(index)
  writeFileSync(OUT_FILE, JSON.stringify(families))
  console.log(`sku-families.json: ${families.length} families written to ${OUT_FILE}`)
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('build-sku-families.js')) {
  main()
}
