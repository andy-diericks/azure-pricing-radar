/**
 * Build-time script: copies data/digests/*.json to app/public/data/digests/
 * and generates app/public/data/digests/manifest.json so Vite includes them
 * in the dist/ output for GitHub Pages.
 *
 * Run via `npm run build`. Silently skips if no digests directory exists.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
const DIGESTS_DATA_DIR = join(DATA_DIR, 'digests')
const PUBLIC_DIGESTS_DIR = resolve(__dirname, '../public/data/digests')

if (!existsSync(DIGESTS_DATA_DIR)) {
  console.log('build-digests-data: no digests directory found, skipping')
  process.exit(0)
}

mkdirSync(PUBLIC_DIGESTS_DIR, { recursive: true })

const files = readdirSync(DIGESTS_DATA_DIR).filter(f => f.endsWith('.json')).sort()
const dailyEntries = []

for (const file of files) {
  const content = readFileSync(join(DIGESTS_DATA_DIR, file))
  writeFileSync(join(PUBLIC_DIGESTS_DIR, file), content)

  // Only include daily digests (YYYY-MM-DD.json) in the manifest
  if (/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) {
    const date = file.replace('.json', '')
    dailyEntries.push({ date, path: `digests/${file}` })
  }
}

writeFileSync(
  join(PUBLIC_DIGESTS_DIR, 'manifest.json'),
  JSON.stringify(dailyEntries, null, 2),
)

console.log(`build-digests-data: copied ${files.length} digest file(s), manifest has ${dailyEntries.length} daily entries`)
