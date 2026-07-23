/**
 * Build-time script: copies data/feed.atom and data/feed.rss to app/public/
 * so Vite includes them in the dist/ output for GitHub Pages.
 *
 * Run via `npm run build`. If the feed files don't exist yet (no price
 * changes have been detected), the copy is silently skipped.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
const PUBLIC_DIR = resolve(__dirname, '../public')

for (const filename of ['feed.atom', 'feed.rss']) {
  const src = join(DATA_DIR, filename)
  if (existsSync(src)) {
    writeFileSync(join(PUBLIC_DIR, filename), readFileSync(src))
    console.log(`build-feed: copied data/${filename} → public/${filename}`)
  } else {
    console.log(`build-feed: data/${filename} not found, skipping`)
  }
}
