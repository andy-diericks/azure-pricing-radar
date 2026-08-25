import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadSkuFamilies, filterFamilies } from './loadSkuFamilies'
import type { SkuFamily } from './loadSkuFamilies'

const FAMILIES: SkuFamily[] = [
  { family: 'Standard_D2s_v5', productName: 'Virtual Machines Dsv5 Series' },
  { family: 'Standard_D4s_v5', productName: 'Virtual Machines Dsv5 Series' },
  { family: 'Standard_E2s_v5', productName: 'Virtual Machines Esv5 Series' },
  { family: 'Redis Cache C1', productName: 'Azure Cache for Redis' },
]

describe('filterFamilies', () => {
  it('returns nothing for an empty query', () => {
    expect(filterFamilies(FAMILIES, '   ')).toEqual([])
  })

  it('is case-insensitive and matches the family name', () => {
    const r = filterFamilies(FAMILIES, 'd2s')
    expect(r[0].family).toBe('Standard_D2s_v5')
  })

  it('ranks prefix matches ahead of substring matches', () => {
    const r = filterFamilies(FAMILIES, 'standard_d')
    expect(r.map((x) => x.family)).toEqual(['Standard_D2s_v5', 'Standard_D4s_v5'])
  })

  it('also matches the product name', () => {
    const r = filterFamilies(FAMILIES, 'redis')
    expect(r.some((x) => x.family === 'Redis Cache C1')).toBe(true)
  })

  it('respects the result limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      family: `Standard_X${i}`,
      productName: 'X',
    }))
    expect(filterFamilies(many, 'standard_x', 5)).toHaveLength(5)
  })
})

describe('loadSkuFamilies', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps the compact {f,p} shape to {family,productName}', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ f: 'Standard_D2s_v5', p: 'Dsv5' }]), { status: 200 }),
      ),
    )
    const list = await loadSkuFamilies()
    expect(list).toEqual([{ family: 'Standard_D2s_v5', productName: 'Dsv5' }])
  })

  it('throws a helpful error on a failed fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 404 })))
    await expect(loadSkuFamilies()).rejects.toThrow(/Failed to load SKU families/)
  })
})
