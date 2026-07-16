import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadHistory } from './loadHistory'
import type { DiffFile, DiffManifestEntry } from '../types'

const MANIFEST: DiffManifestEntry[] = [
  { path: 'diffs/2026-07-15/1741-vm-eu-west.json', scope: 'vm-eu-west', date: '2026-07-15' },
  { path: 'diffs/2026-07-16/1741-vm-eu-west.json', scope: 'vm-eu-west', date: '2026-07-16' },
]

const BASE_ITEM = {
  key: 'K1',
  retailPrice: 0.096,
  unitPrice: 0.096,
  unitOfMeasure: '1 Hour',
  productName: 'Virtual Machines Dsv5',
  skuName: 'Standard_D2s_v5',
  meterName: 'D2s v5',
  armRegionName: 'westeurope',
}

const DIFF_DAY1: DiffFile = {
  scope: 'vm-eu-west',
  at: '2026-07-15T17:41:10Z',
  added: [BASE_ITEM],
  removed: [],
  changed: [],
}

const DIFF_DAY2: DiffFile = {
  scope: 'vm-eu-west',
  at: '2026-07-16T17:41:10Z',
  added: [],
  removed: [],
  changed: [
    {
      key: 'K1',
      before: BASE_ITEM,
      after: { ...BASE_ITEM, retailPrice: 0.085, unitPrice: 0.085 },
    },
  ],
}

function mockFetch(url: string): Promise<Response> {
  if (url === '/data/diffs/manifest.json') {
    return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
  }
  if (url === '/data/diffs/2026-07-15/1741-vm-eu-west.json') {
    return Promise.resolve(new Response(JSON.stringify(DIFF_DAY1), { status: 200 }))
  }
  if (url === '/data/diffs/2026-07-16/1741-vm-eu-west.json') {
    return Promise.resolve(new Response(JSON.stringify(DIFF_DAY2), { status: 200 }))
  }
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}

describe('loadHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a point for an added SKU', async () => {
    const points = await loadHistory('K1')
    expect(points[0]).toEqual({ at: '2026-07-15T17:41:10Z', price: 0.096 })
  })

  it('returns the after price for a changed SKU', async () => {
    const points = await loadHistory('K1')
    expect(points[1]).toEqual({ at: '2026-07-16T17:41:10Z', price: 0.085 })
  })

  it('returns two points across two diffs', async () => {
    const points = await loadHistory('K1')
    expect(points).toHaveLength(2)
  })

  it('returns points in chronological order', async () => {
    const points = await loadHistory('K1')
    expect(points[0].at < points[1].at).toBe(true)
  })

  it('returns empty array for an unknown key', async () => {
    const points = await loadHistory('UNKNOWN')
    expect(points).toEqual([])
  })

  it('records null price for a removed SKU', async () => {
    const removedDiff: DiffFile = {
      ...DIFF_DAY1,
      added: [],
      removed: [BASE_ITEM],
    }
    vi.stubGlobal('fetch', (url: string) => {
      if (url === '/data/diffs/manifest.json') {
        return Promise.resolve(new Response(JSON.stringify([MANIFEST[0]]), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify(removedDiff), { status: 200 }))
    })
    const points = await loadHistory('K1')
    expect(points[0]).toEqual({ at: '2026-07-15T17:41:10Z', price: null })
  })

  it('throws when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    await expect(loadHistory('K1')).rejects.toThrow('Manifest fetch failed')
  })

  it('skips diff files that fail to load', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      if (url === '/data/diffs/manifest.json') {
        return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
      }
      if (url.includes('2026-07-15')) {
        return Promise.resolve(new Response(JSON.stringify(DIFF_DAY1), { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    const points = await loadHistory('K1')
    expect(points).toHaveLength(1)
    expect(points[0].price).toBe(0.096)
  })
})
