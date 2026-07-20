import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BiggestMovers } from './BiggestMovers'
import { computeMovers, WINDOW_7_MS, WINDOW_30_MS } from '../lib/movers'
import type { TableRow } from '../types'

const NOW = new Date('2026-07-20T12:00:00Z').getTime()
const AT_3D = new Date('2026-07-17T12:00:00Z').toISOString()   // 3 days ago — within 7d and 30d
const AT_10D = new Date('2026-07-10T12:00:00Z').toISOString()  // 10 days ago — within 30d only
const AT_40D = new Date('2026-06-10T12:00:00Z').toISOString()  // 40 days ago — outside both

function makeRow(overrides: Partial<TableRow>): TableRow {
  return {
    key: 'k1',
    itemKey: 'k1',
    direction: 'drop',
    scope: 'vm-eu-west',
    productName: 'Virtual Machines',
    skuName: 'Standard_D2s_v5',
    unitOfMeasure: '1 Hour',
    armRegionName: 'westeurope',
    priceBefore: 0.1,
    priceAfter: 0.09,
    at: AT_3D,
    ...overrides,
  }
}

describe('computeMovers', () => {
  it('returns top drops sorted by magnitude descending', () => {
    const rows: TableRow[] = [
      makeRow({ key: 'a', priceBefore: 1.0, priceAfter: 0.8, direction: 'drop' }),  // -20%
      makeRow({ key: 'b', priceBefore: 1.0, priceAfter: 0.95, direction: 'drop' }), // -5%
      makeRow({ key: 'c', priceBefore: 1.0, priceAfter: 0.85, direction: 'drop' }), // -15%
    ]
    const { drops } = computeMovers(rows, WINDOW_7_MS, NOW)
    expect(drops[0].row.key).toBe('a')
    expect(drops[1].row.key).toBe('c')
    expect(drops[2].row.key).toBe('b')
  })

  it('returns top increases sorted by magnitude descending', () => {
    const rows: TableRow[] = [
      makeRow({ key: 'a', priceBefore: 1.0, priceAfter: 1.3, direction: 'increase' }),  // +30%
      makeRow({ key: 'b', priceBefore: 1.0, priceAfter: 1.1, direction: 'increase' }),  // +10%
    ]
    const { increases } = computeMovers(rows, WINDOW_7_MS, NOW)
    expect(increases[0].row.key).toBe('a')
    expect(increases[0].pct).toBeCloseTo(30)
    expect(increases[1].row.key).toBe('b')
  })

  it('caps results at 3 per direction', () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ key: `d${i}`, priceBefore: 1.0, priceAfter: 0.9 - i * 0.01, direction: 'drop' }),
    )
    const { drops } = computeMovers(rows, WINDOW_7_MS, NOW)
    expect(drops).toHaveLength(3)
  })

  it('filters by 7-day window — rows older than 7 days are excluded', () => {
    const rows: TableRow[] = [
      makeRow({ key: 'in', at: AT_3D }),
      makeRow({ key: 'out', at: AT_10D }),
    ]
    const { drops } = computeMovers(rows, WINDOW_7_MS, NOW)
    expect(drops).toHaveLength(1)
    expect(drops[0].row.key).toBe('in')
  })

  it('filters by 30-day window — rows within 30 days are included', () => {
    const rows: TableRow[] = [
      makeRow({ key: 'in7', at: AT_3D }),
      makeRow({ key: 'in30', at: AT_10D }),
      makeRow({ key: 'out', at: AT_40D }),
    ]
    const { drops } = computeMovers(rows, WINDOW_30_MS, NOW)
    expect(drops).toHaveLength(2)
    const keys = drops.map(m => m.row.key)
    expect(keys).toContain('in7')
    expect(keys).toContain('in30')
  })

  it('excludes new and removed directions', () => {
    const rows: TableRow[] = [
      makeRow({ key: 'new', direction: 'new', priceBefore: null }),
      makeRow({ key: 'removed', direction: 'removed', priceAfter: 0 }),
    ]
    const { drops, increases } = computeMovers(rows, WINDOW_30_MS, NOW)
    expect(drops).toHaveLength(0)
    expect(increases).toHaveLength(0)
  })

  it('excludes rows with null or zero priceBefore', () => {
    const rows: TableRow[] = [
      makeRow({ key: 'nullBefore', priceBefore: null }),
      makeRow({ key: 'zeroBefore', priceBefore: 0 }),
    ]
    const { drops } = computeMovers(rows, WINDOW_30_MS, NOW)
    expect(drops).toHaveLength(0)
  })

  it('computes pct correctly', () => {
    const rows = [makeRow({ priceBefore: 0.1, priceAfter: 0.09 })] // -10%
    const { drops } = computeMovers(rows, WINDOW_7_MS, NOW)
    expect(drops[0].pct).toBeCloseTo(10)
  })
})

describe('BiggestMovers component', () => {
  it('shows loading skeleton when loading=true', () => {
    const { container } = render(<BiggestMovers rows={[]} loading now={NOW} />)
    expect(container.querySelector('.bm__skeleton-wrap')).toBeTruthy()
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })

  it('renders the section heading', () => {
    render(<BiggestMovers rows={[]} now={NOW} />)
    expect(screen.getByText('Biggest movers')).toBeTruthy()
  })

  it('shows empty state when no rows in window', () => {
    render(<BiggestMovers rows={[makeRow({ at: AT_40D })]} now={NOW} />)
    const empties = screen.getAllByText('No price changes in this period')
    expect(empties.length).toBeGreaterThan(0)
  })

  it('renders drop items with correct SKU and percentage', () => {
    const rows = [makeRow({ priceBefore: 1.0, priceAfter: 0.9, direction: 'drop', skuName: 'SKU_A' })]
    render(<BiggestMovers rows={rows} now={NOW} />)
    const skuEls = screen.getAllByText('SKU_A')
    expect(skuEls.length).toBeGreaterThan(0)
    const pcts = screen.getAllByText('-10.0%')
    expect(pcts.length).toBeGreaterThan(0)
  })

  it('renders increase items with correct percentage', () => {
    const row = makeRow({ priceBefore: 1.0, priceAfter: 1.2, direction: 'increase' })
    render(<BiggestMovers rows={[row]} now={NOW} />)
    const pcts = screen.getAllByText('+20.0%')
    expect(pcts.length).toBeGreaterThan(0)
  })

  it('calls onItemClick when an item is clicked', () => {
    const handler = vi.fn()
    const row = makeRow({ key: 'mykey', priceBefore: 1.0, priceAfter: 0.8, direction: 'drop' })
    render(<BiggestMovers rows={[row]} onItemClick={handler} now={NOW} />)
    const items = screen.getAllByRole('button')
    fireEvent.click(items[0])
    expect(handler).toHaveBeenCalledWith('mykey')
  })

  it('calls onItemClick on Enter key', () => {
    const handler = vi.fn()
    const row = makeRow({ key: 'mykey', priceBefore: 1.0, priceAfter: 0.8, direction: 'drop' })
    render(<BiggestMovers rows={[row]} onItemClick={handler} now={NOW} />)
    const items = screen.getAllByRole('button')
    fireEvent.keyDown(items[0], { key: 'Enter' })
    expect(handler).toHaveBeenCalledWith('mykey')
  })

  it('shows items in both 7-day and 30-day windows for recent rows', () => {
    const row = makeRow({ priceBefore: 1.0, priceAfter: 0.9, direction: 'drop' })
    render(<BiggestMovers rows={[row]} now={NOW} />)
    expect(screen.getByText('Last 7 days')).toBeTruthy()
    expect(screen.getByText('Last 30 days')).toBeTruthy()
  })

  it('shows item only in 30-day window when row is 10 days old', () => {
    const row = makeRow({ priceBefore: 1.0, priceAfter: 0.8, direction: 'drop', at: AT_10D })
    render(<BiggestMovers rows={[row]} now={NOW} />)
    const empties = screen.getAllByText('No price changes in this period')
    // 7-day window should be empty; 30-day window has data
    expect(empties).toHaveLength(1)
  })

  it('omits drop group when no drops exist', () => {
    const row = makeRow({ priceBefore: 1.0, priceAfter: 1.2, direction: 'increase' })
    render(<BiggestMovers rows={[row]} now={NOW} />)
    expect(screen.queryAllByText('▼ Biggest drops')).toHaveLength(0)
    expect(screen.getAllByText('▲ Biggest increases').length).toBeGreaterThan(0)
  })

  it('omits increase group when no increases exist', () => {
    const row = makeRow({ priceBefore: 1.0, priceAfter: 0.8, direction: 'drop' })
    render(<BiggestMovers rows={[row]} now={NOW} />)
    expect(screen.queryAllByText('▲ Biggest increases')).toHaveLength(0)
    expect(screen.getAllByText('▼ Biggest drops').length).toBeGreaterThan(0)
  })
})
