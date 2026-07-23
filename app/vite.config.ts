import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync, statSync } from 'fs'
import { resolve, join } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

const DATA_DIR = resolve(__dirname, '../data')

function buildManifest(): object[] {
  const diffsDir = join(DATA_DIR, 'diffs')
  const entries: object[] = []
  try {
    for (const dateDir of readdirSync(diffsDir).sort()) {
      const dateDirPath = join(diffsDir, dateDir)
      if (!statSync(dateDirPath).isDirectory()) continue
      for (const file of readdirSync(dateDirPath)) {
        if (!file.endsWith('.json')) continue
        const scope = file.replace(/^\d{4}-/, '').replace('.json', '')
        entries.push({ path: `diffs/${dateDir}/${file}`, scope, date: dateDir })
      }
    }
  } catch {
    // no diffs directory yet — return empty manifest
  }
  return entries
}

function buildDigestsManifest(): object[] {
  const digestsDir = join(DATA_DIR, 'digests')
  const entries: object[] = []
  try {
    for (const file of readdirSync(digestsDir).sort()) {
      if (!file.endsWith('.json')) continue
      const date = file.replace('.json', '')
      entries.push({ date, path: `digests/${file}` })
    }
  } catch {
    // no digests directory yet — return empty manifest
  }
  return entries
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/azure-pricing-radar/' : '/',
  plugins: [
    react(),
    {
      name: 'serve-data-dir',
      configureServer(server) {
        server.middlewares.use(
          '/data',
          (req: IncomingMessage, res: ServerResponse, next: () => void) => {
            const url = (req.url ?? '/').split('?')[0]

            if (url === '/diffs/manifest.json') {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(buildManifest()))
              return
            }

            if (url === '/digests/manifest.json') {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(buildDigestsManifest()))
              return
            }

            const filePath = join(DATA_DIR, url)
            try {
              const stat = statSync(filePath)
              if (stat.isFile()) {
                res.setHeader('Content-Type', 'application/json')
                res.end(readFileSync(filePath))
                return
              }
            } catch {
              // fall through to next()
            }

            next()
          },
        )
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
