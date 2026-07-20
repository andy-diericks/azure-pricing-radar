import type { ChangeDirection, TableRow } from '../types'

export interface FilterState {
  selectedServices: string[]
  selectedRegions: string[]
  selectedDirections: ChangeDirection[]
  minMagnitude: number
  searchTerm: string
}

export const EMPTY_FILTERS: FilterState = {
  selectedServices: [],
  selectedRegions: [],
  selectedDirections: [],
  minMagnitude: 0,
  searchTerm: '',
}

export function parseFiltersFromSearch(search: string): FilterState {
  const params = new URLSearchParams(search)
  const split = (key: string): string[] => {
    const v = params.get(key)
    return v ? v.split(',').filter(Boolean) : []
  }
  const mag = parseFloat(params.get('magnitude') ?? '0')
  return {
    selectedServices: split('service'),
    selectedRegions: split('region'),
    selectedDirections: split('direction') as ChangeDirection[],
    minMagnitude: isNaN(mag) || mag < 0 ? 0 : Math.min(mag, 100),
    searchTerm: params.get('search') ?? '',
  }
}

export function filtersToSearch(f: FilterState): string {
  const p = new URLSearchParams()
  if (f.selectedServices.length) p.set('service', f.selectedServices.join(','))
  if (f.selectedRegions.length) p.set('region', f.selectedRegions.join(','))
  if (f.selectedDirections.length) p.set('direction', f.selectedDirections.join(','))
  if (f.minMagnitude > 0) p.set('magnitude', String(f.minMagnitude))
  if (f.searchTerm) p.set('search', f.searchTerm)
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function applyFilters(rows: TableRow[], f: FilterState): TableRow[] {
  const term = f.searchTerm.toLowerCase()
  return rows.filter(row => {
    if (term && !row.skuName.toLowerCase().includes(term)) return false
    if (f.selectedServices.length > 0 && !f.selectedServices.includes(row.scope)) return false
    if (f.selectedRegions.length > 0 && !f.selectedRegions.includes(row.armRegionName)) return false
    if (f.selectedDirections.length > 0 && !f.selectedDirections.includes(row.direction)) return false
    if (f.minMagnitude > 0 && (row.direction === 'drop' || row.direction === 'increase')) {
      if (row.priceBefore === null || row.priceBefore === 0) return true
      const pct = Math.abs((row.priceAfter - row.priceBefore) / row.priceBefore * 100)
      if (pct < f.minMagnitude) return false
    }
    return true
  })
}
