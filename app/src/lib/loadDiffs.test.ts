import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadDiffs } from './loadDiffs'
import type { DiffFile, DiffManifestEntry } from '../types'

const MANIFEST: DiffManifestEntry[] = [
  { path: 'diffs/2026-07-15/1741-vm-eu-west.json', scope: 'vm-eu-west', date: '2026-07-15' },
  { path: 'diffs/2026-07-15/1741-storage-eu-west.json', scope: 'storage-eu-west', date: '2026-07-15' },
]

const VM_DIFF: DiffFile = {
  scope: 'vm-eu-west',
  at: '2026-07-15T17:41:10Z',
  added: [
    {
      key: 'K1',
      retailPrice: 0.096,
      unitPrice: 0.096,
      unitOfMeasure: '1 Hour',
      productName: 'Virtual Machines Dsv5',
      skuName: 'Standard_D2s_v5',
      meterName: 'D2s v5',
      armRegionName: 'westeurope',
    },
  ],
  removed: [],
  changed: [
    {
      key: 'K2',
      before: {
        key: 'K2',
        retailPrice: 0.5,
        unitPrice: 0.5,
        unitOfMeasure: '1 Hour',
        productName: 'Virtual Machines Esv5',
        skuName: 'Standard_E4s_v5',
        meterName: 'E4s v5',
        armRegionName: 'westeurope',
      },
      after: {
        key: 'K2',
        retailPrice: 0.45,
        unitPrice: 0.45,
        unitOfMeasure: '1 Hour',
        productName: 'Virtual Machines Esv5',
        skuName: 'Standard_E4s_v5',
        meterName: 'E4s v5',
        armRegionName: 'westeurope',
      },
    },
  ],
}

function mockFetch(url: string): Promise<Response> {
  if (url === '/data/diffs/manifest.json') {
    return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
  }
  if (url === '/data/diffs/2026-07-15/1741-vm-eu-west.json') {
    return Promise.resolve(new Response(JSON.stringify(VM_DIFF), { status: 200 }))
  }
  if (url === '/data/diffs/2026-07-15/1741-storage-eu-west.json') {
    return Promise.resolve(
      new Response(
        JSON.stringify({ scope: 'storage-eu-west', at: '2026-07-15T17:41:10Z', added: [], removed: [], changed: [] }),
        { status: 200 },
      ),
    )
  }
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}

describe('loadDiffs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns rows from the latest diff files', async () => {
    const rows = await loadDiffs()
    expect(rows.length).toBeGreaterThan(0)
  })

  it('prioritises changed rows over new SKUs', async () => {
    const rows = await loadDiffs()
    const firstRow = rows[0]
    expect(firstRow.direction).toBe('drop')
  })

  it('maps added items to direction=new', async () => {
    const rows = await loadDiffs()
    const newRow = rows.find((r) => r.direction === 'new')
    expect(newRow).toBeDefined()
    expect(newRow?.skuName).toBe('Standard_D2s_v5')
    expect(newRow?.priceBefore).toBeNull()
    expect(newRow?.priceAfter).toBe(0.096)
  })

  it('maps changed items to drop or increase', async () => {
    const rows = await loadDiffs()
    const drop = rows.find((r) => r.direction === 'drop')
    expect(drop).toBeDefined()
    expect(drop?.priceBefore).toBe(0.5)
    expect(drop?.priceAfter).toBe(0.45)
  })

  it('throws when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    await expect(loadDiffs()).rejects.toThrow('Manifest fetch failed')
  })

  it('returns empty array when manifest is empty', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
    )
    const rows = await loadDiffs()
    expect(rows).toEqual([])
  })
})
