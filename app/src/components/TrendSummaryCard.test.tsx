import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendSummaryCard } from './TrendSummaryCard'
import type { SkuEntry } from '../lib/skuIndex'

function makeEntry(overrides: Partial<SkuEntry> = {}): SkuEntry {
  return {
    productName: 'Virtual Machines Dsv5 Series',
    regions: [
      { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.088, unitOfMeasure: '1 Hour' },
    ],
    history: [],
    ...overrides,
  }
}

const ENTRY_WITH_HISTORY: SkuEntry = {
  productName: 'Virtual Machines Dsv5 Series',
  regions: [
    { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.088, unitOfMeasure: '1 Hour' },
  ],
  history: [
    { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
    { at: '2026-07-16T12:00:00Z', armRegionName: 'westeurope', retailPrice: 0.088, priceBefore: 0.096, direction: 'changed' },
  ],
}

describe('TrendSummaryCard', () => {
  it('renders the card with heading', () => {
    render(<TrendSummaryCard entry={makeEntry()} primaryRegion="westeurope" />)
    expect(screen.getByTestId('trend-summary-card')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Trend summary')
  })

  it('shows "Insufficient history" badge for 30-day and 90-day when no history', () => {
    render(<TrendSummaryCard entry={makeEntry()} primaryRegion="westeurope" />)
    const badges = screen.getAllByText('Insufficient history')
    expect(badges.length).toBe(2)
  })

  it('shows drop badge for 30-day when price decreased in window', () => {
    render(<TrendSummaryCard entry={ENTRY_WITH_HISTORY} primaryRegion="westeurope" />)
    const badge = screen.getAllByText(/↓/)[0]
    expect(badge).toHaveClass('tsc__badge--drop')
  })

  it('shows percentage magnitude in drop badge', () => {
    render(<TrendSummaryCard entry={ENTRY_WITH_HISTORY} primaryRegion="westeurope" />)
    const badges = screen.getAllByText(/↓ 8\.3%/)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('shows increase badge when price went up', () => {
    const entry = makeEntry({
      history: [
        { at: '2026-07-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.080, direction: 'added' },
        { at: '2026-07-16T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.096, priceBefore: 0.080, direction: 'changed' },
      ],
    })
    render(<TrendSummaryCard entry={entry} primaryRegion="westeurope" />)
    const badges = screen.getAllByText(/↑/)
    expect(badges.length).toBeGreaterThan(0)
    expect(badges[0]).toHaveClass('tsc__badge--increase')
  })

  it('shows "Not yet determined" when data is stale for window', () => {
    const entry = makeEntry({
      history: [
        { at: '2025-05-01T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.100, direction: 'added' },
        { at: '2025-05-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: 0.090, priceBefore: 0.100, direction: 'changed' },
      ],
    })
    render(<TrendSummaryCard entry={entry} primaryRegion="westeurope" />)
    expect(screen.getAllByText('Not yet determined').length).toBeGreaterThanOrEqual(1)
  })

  it('shows first-seen date when history exists', () => {
    render(<TrendSummaryCard entry={ENTRY_WITH_HISTORY} primaryRegion="westeurope" />)
    expect(screen.getByText('15 Jul 2026')).toBeInTheDocument()
  })

  it('shows "—" when no first-seen date', () => {
    const entry = makeEntry({
      history: [
        { at: '2026-07-15T00:00:00Z', armRegionName: 'westeurope', retailPrice: null, direction: 'removed' },
      ],
    })
    render(<TrendSummaryCard entry={entry} primaryRegion="westeurope" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows price change count', () => {
    render(<TrendSummaryCard entry={ENTRY_WITH_HISTORY} primaryRegion="westeurope" />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows current price from cheapest region', () => {
    render(<TrendSummaryCard entry={ENTRY_WITH_HISTORY} primaryRegion="westeurope" />)
    expect(screen.getByText('$0.088 / 1 Hour')).toBeInTheDocument()
  })

  it('does not render current price stat when no regions', () => {
    const entry = makeEntry({ regions: [] })
    render(<TrendSummaryCard entry={entry} primaryRegion="westeurope" />)
    expect(screen.queryByText(/current price/i)).not.toBeInTheDocument()
  })

  it('renders stat labels for all stats', () => {
    render(<TrendSummaryCard entry={ENTRY_WITH_HISTORY} primaryRegion="westeurope" />)
    expect(screen.getByText('30-day trend')).toBeInTheDocument()
    expect(screen.getByText('90-day trend')).toBeInTheDocument()
    expect(screen.getByText('First seen')).toBeInTheDocument()
    expect(screen.getByText('Price changes')).toBeInTheDocument()
    expect(screen.getByText('Current price')).toBeInTheDocument()
  })
})
