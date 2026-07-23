import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadDigests } from './loadDigests'
import type { DigestManifestEntry } from './loadDigests'
import type { DigestData } from './digest'

const MANIFEST: DigestManifestEntry[] = [
  { date: '2026-07-15', path: 'digests/2026-07-15.json' },
  { date: '2026-07-16', path: 'digests/2026-07-16.json' },
]

const DIGEST_A: DigestData = {
  date: '2026-07-15',
  totalDrops: 0,
  totalIncreases: 0,
  totalNewSkus: 9904,
  totalRemoved: 0,
  sections: [],
}

const DIGEST_B: DigestData = {
  date: '2026-07-16',
  totalDrops: 3,
  totalIncreases: 1,
  totalNewSkus: 0,
  totalRemoved: 0,
  sections: [],
}

function mockFetch(url: string): Promise<Response> {
  if (url === '/data/digests/manifest.json') {
    return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
  }
  if (url.includes('2026-07-15.json')) {
    return Promise.resolve(new Response(JSON.stringify(DIGEST_A), { status: 200 }))
  }
  if (url.includes('2026-07-16.json')) {
    return Promise.resolve(new Response(JSON.stringify(DIGEST_B), { status: 200 }))
  }
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}

describe('loadDigests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns entries sorted newest-first', async () => {
    const result = await loadDigests()
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].date).toBe('2026-07-16')
    expect(result.entries[1].date).toBe('2026-07-15')
  })

  it('throws when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('Server Error', { status: 500 })),
    )
    await expect(loadDigests()).rejects.toThrow('Digest manifest fetch failed: 500')
  })

  it('returns empty entries for empty manifest', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
    )
    const result = await loadDigests()
    expect(result.entries).toHaveLength(0)
  })

  it('skips digest files that return 404', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
      }
      if (url.includes('2026-07-15.json')) {
        return Promise.resolve(new Response(JSON.stringify(DIGEST_A), { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    const result = await loadDigests()
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].date).toBe('2026-07-15')
  })
})
