import { describe, it, expect } from 'vitest'
import { parseFiltersFromSearch, filtersToSearch, applyFilters, EMPTY_FILTERS } from './filters'
import type { TableRow } from '../types'

function makeRow(overrides: Partial<TableRow> = {}): TableRow {
  return {
    key: 'k1',
    itemKey: 'K1',
    direction: 'drop',
    scope: 'vm-eu-west',
    productName: 'Virtual Machines',
    skuName: 'Standard_D2s_v5',
    unitOfMeasure: '1 Hour',
    armRegionName: 'westeurope',
    priceBefore: 0.1,
    priceAfter: 0.09,
    at: '2026-07-15T17:41:10Z',
    ...overrides,
  }
}

describe('parseFiltersFromSearch', () => {
  it('returns EMPTY_FILTERS for an empty query string', () => {
    expect(parseFiltersFromSearch('')).toEqual(EMPTY_FILTERS)
  })

  it('parses all filter params', () => {
    const result = parseFiltersFromSearch(
      '?service=vm-eu-west,storage-eu-west&region=westeurope&direction=drop,increase&magnitude=5',
    )
    expect(result).toEqual({
      selectedServices: ['vm-eu-west', 'storage-eu-west'],
      selectedRegions: ['westeurope'],
      selectedDirections: ['drop', 'increase'],
      minMagnitude: 5,
    })
  })

  it('clamps a negative magnitude to 0', () => {
    expect(parseFiltersFromSearch('?magnitude=-10').minMagnitude).toBe(0)
  })

  it('clamps magnitude above 100 to 100', () => {
    expect(parseFiltersFromSearch('?magnitude=200').minMagnitude).toBe(100)
  })
})

describe('filtersToSearch', () => {
  it('returns empty string for EMPTY_FILTERS', () => {
    expect(filtersToSearch(EMPTY_FILTERS)).toBe('')
  })

  it('serializes all set filters', () => {
    const search = filtersToSearch({
      selectedServices: ['vm-eu-west'],
      selectedRegions: ['westeurope'],
      selectedDirections: ['drop'],
      minMagnitude: 10,
    })
    const params = new URLSearchParams(search.slice(1))
    expect(params.get('service')).toBe('vm-eu-west')
    expect(params.get('region')).toBe('westeurope')
    expect(params.get('direction')).toBe('drop')
    expect(params.get('magnitude')).toBe('10')
  })

  it('round-trips through parse', () => {
    const original = {
      selectedServices: ['vm-eu-west', 'storage-eu-west'],
      selectedRegions: ['westeurope'],
      selectedDirections: ['drop' as const, 'increase' as const],
      minMagnitude: 5,
    }
    expect(parseFiltersFromSearch(filtersToSearch(original))).toEqual(original)
  })
})

describe('applyFilters', () => {
  it('returns all rows when filters are empty', () => {
    const rows = [makeRow(), makeRow({ key: 'k2', direction: 'increase' })]
    expect(applyFilters(rows, EMPTY_FILTERS)).toEqual(rows)
  })

  it('filters by service', () => {
    const rows = [
      makeRow({ key: 'k1', scope: 'vm-eu-west' }),
      makeRow({ key: 'k2', scope: 'storage-eu-west' }),
    ]
    const result = applyFilters(rows, { ...EMPTY_FILTERS, selectedServices: ['vm-eu-west'] })
    expect(result).toHaveLength(1)
    expect(result[0].scope).toBe('vm-eu-west')
  })

  it('filters by region', () => {
    const rows = [
      makeRow({ key: 'k1', armRegionName: 'westeurope' }),
      makeRow({ key: 'k2', armRegionName: 'northeurope' }),
    ]
    const result = applyFilters(rows, { ...EMPTY_FILTERS, selectedRegions: ['northeurope'] })
    expect(result).toHaveLength(1)
    expect(result[0].armRegionName).toBe('northeurope')
  })

  it('filters by direction', () => {
    const rows = [
      makeRow({ key: 'k1', direction: 'drop' }),
      makeRow({ key: 'k2', direction: 'increase' }),
      makeRow({ key: 'k3', direction: 'new', priceBefore: null }),
    ]
    const result = applyFilters(rows, { ...EMPTY_FILTERS, selectedDirections: ['drop'] })
    expect(result).toHaveLength(1)
    expect(result[0].direction).toBe('drop')
  })

  it('filters by magnitude for drop/increase rows', () => {
    const rows = [
      makeRow({ key: 'k1', direction: 'drop', priceBefore: 0.1, priceAfter: 0.09 }),   // 10% drop
      makeRow({ key: 'k2', direction: 'drop', priceBefore: 0.1, priceAfter: 0.099 }),  // 1% drop
    ]
    const result = applyFilters(rows, { ...EMPTY_FILTERS, minMagnitude: 5 })
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('k1')
  })

  it('always includes new/removed rows regardless of magnitude', () => {
    const rows = [
      makeRow({ key: 'k1', direction: 'new', priceBefore: null, priceAfter: 0.1 }),
      makeRow({ key: 'k2', direction: 'removed', priceBefore: 0.1, priceAfter: 0 }),
    ]
    const result = applyFilters(rows, { ...EMPTY_FILTERS, minMagnitude: 50 })
    expect(result).toHaveLength(2)
  })
})
