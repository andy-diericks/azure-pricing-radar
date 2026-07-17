import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PriceChangesTable } from './PriceChangesTable'
import type { TableRow } from '../types'

function makeRow(overrides: Partial<TableRow> = {}): TableRow {
  return {
    key: 'test-key',
    itemKey: 'raw-item-key',
    direction: 'new',
    scope: 'vm-eu-west',
    productName: 'Virtual Machines Dsv5 Series',
    skuName: 'Standard_D2s_v5',
    unitOfMeasure: '1 Hour',
    armRegionName: 'westeurope',
    priceBefore: null,
    priceAfter: 0.096,
    at: '2026-07-15T17:41:10Z',
    ...overrides,
  }
}

describe('PriceChangesTable — loading and state', () => {
  it('renders skeleton rows when loading', () => {
    const { container } = render(<PriceChangesTable rows={[]} loading={true} />)
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
    expect(container.querySelectorAll('.pct__skeleton-row')).toHaveLength(6)
    expect(container.querySelectorAll('.pct__card--skeleton')).toHaveLength(6)
  })

  it('skeleton table has the same column headers as the data table', () => {
    render(<PriceChangesTable rows={[]} loading={true} />)
    expect(screen.getByRole('columnheader', { name: /change/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /sku/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^%$/ })).toBeInTheDocument()
  })

  it('does not show skeleton when not loading', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} loading={false} />)
    expect(container.querySelector('[data-testid="table-skeleton"]')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.pct__skeleton-row')).toHaveLength(0)
  })

  it('renders error state with headline and message', () => {
    render(<PriceChangesTable rows={[]} error="Manifest fetch failed: 500" />)
    expect(screen.getByText(/failed to load price changes/i)).toBeInTheDocument()
    expect(screen.getByText('Manifest fetch failed: 500')).toBeInTheDocument()
  })

  it('error state does not render a table', () => {
    const { container } = render(
      <PriceChangesTable rows={[]} error="something went wrong" />,
    )
    expect(container.querySelector('table')).not.toBeInTheDocument()
  })
})

describe('PriceChangesTable', () => {
  it('shows empty state when no rows', () => {
    render(<PriceChangesTable rows={[]} />)
    expect(screen.getByText(/no price changes/i)).toBeInTheDocument()
  })

  it('empty state shows subline text', () => {
    render(<PriceChangesTable rows={[]} />)
    expect(screen.getByText(/check back after the next data fetch/i)).toBeInTheDocument()
  })

  it('empty state does not render a table', () => {
    const { container } = render(<PriceChangesTable rows={[]} />)
    expect(container.querySelector('table')).not.toBeInTheDocument()
  })

  it('renders column headers', () => {
    render(<PriceChangesTable rows={[makeRow()]} />)
    expect(screen.getByRole('columnheader', { name: /change/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /sku/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /product/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /region/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^%$/ })).toBeInTheDocument()
  })

  it('renders a new SKU row with correct badge and price', () => {
    render(<PriceChangesTable rows={[makeRow()]} />)
    // Content appears in both table and card; verify at least one instance exists
    expect(screen.getAllByText('Standard_D2s_v5')[0]).toBeInTheDocument()
    expect(screen.getAllByText(/★ New/)[0]).toBeInTheDocument()
    expect(screen.getAllByText('$0.096')[0]).toBeInTheDocument()
    expect(screen.getAllByText('—')[0]).toBeInTheDocument()
  })

  it('renders a price drop row with before and after prices and percentage', () => {
    render(
      <PriceChangesTable
        rows={[makeRow({ direction: 'drop', priceBefore: 0.1, priceAfter: 0.09 })]}
      />,
    )
    expect(screen.getAllByText(/▼ Drop/)[0]).toBeInTheDocument()
    expect(screen.getAllByText('$0.10')[0]).toBeInTheDocument()
    expect(screen.getAllByText('$0.09')[0]).toBeInTheDocument()
    expect(screen.getAllByText('-10.0%')[0]).toBeInTheDocument()
  })

  it('renders a price increase row with percentage', () => {
    render(
      <PriceChangesTable
        rows={[makeRow({ direction: 'increase', priceBefore: 0.09, priceAfter: 0.1 })]}
      />,
    )
    expect(screen.getAllByText(/▲ Increase/)[0]).toBeInTheDocument()
    expect(screen.getAllByText('$0.09')[0]).toBeInTheDocument()
    expect(screen.getAllByText('$0.10')[0]).toBeInTheDocument()
    expect(screen.getAllByText('+11.1%')[0]).toBeInTheDocument()
  })

  it('renders a removed SKU row', () => {
    render(
      <PriceChangesTable
        rows={[makeRow({ direction: 'removed', priceBefore: 0.096, priceAfter: 0 })]}
      />,
    )
    expect(screen.getAllByText(/✕ Removed/)[0]).toBeInTheDocument()
    expect(screen.getAllByText('$0.096')[0]).toBeInTheDocument()
  })

  it('shows dash in % column for new and removed rows', () => {
    render(
      <PriceChangesTable
        rows={[
          makeRow({ key: 'r1', direction: 'new' }),
          makeRow({ key: 'r2', direction: 'removed', priceBefore: 0.096, priceAfter: 0 }),
        ]}
      />,
    )
    // Both new and removed should show '—' for the % column (and priceBefore for new)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('renders multiple rows', () => {
    const rows = [
      makeRow({ key: 'r1', direction: 'new', skuName: 'SKU-A' }),
      makeRow({ key: 'r2', direction: 'drop', skuName: 'SKU-B', priceBefore: 0.5, priceAfter: 0.4 }),
    ]
    render(<PriceChangesTable rows={rows} />)
    expect(screen.getAllByText('SKU-A')[0]).toBeInTheDocument()
    expect(screen.getAllByText('SKU-B')[0]).toBeInTheDocument()
  })

  it('applies the correct CSS class per direction', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow({ direction: 'drop' })]} />,
    )
    expect(container.querySelector('.pct__badge--drop')).toBeInTheDocument()
    expect(container.querySelector('.pct__row--drop')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when a table row is clicked', () => {
    const onRowClick = vi.fn()
    const { container } = render(<PriceChangesTable rows={[makeRow()]} onRowClick={onRowClick} />)
    fireEvent.click(container.querySelector('.pct__row--clickable')!)
    expect(onRowClick).toHaveBeenCalledOnce()
    expect(onRowClick).toHaveBeenCalledWith(makeRow())
  })

  it('adds clickable class when onRowClick is provided', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow()]} onRowClick={vi.fn()} />,
    )
    expect(container.querySelector('.pct__row--clickable')).toBeInTheDocument()
  })

  it('does not add clickable class when onRowClick is absent', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    expect(container.querySelector('.pct__row--clickable')).not.toBeInTheDocument()
  })
})

describe('PriceChangesTable — accessibility', () => {
  it('direction badge is aria-hidden', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    const badge = container.querySelector('.pct__badge')!
    expect(badge).toHaveAttribute('aria-hidden', 'true')
  })

  it('sr-only span provides screen-reader text for "new" direction', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow({ direction: 'new' })]} />)
    const srOnly = container.querySelector('.pct__row .sr-only')!
    expect(srOnly).toHaveTextContent('new SKU')
  })

  it('sr-only span provides screen-reader text for "price drop" direction', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow({ direction: 'drop', priceBefore: 0.1, priceAfter: 0.09 })]} />,
    )
    const srOnly = container.querySelector('.pct__row .sr-only')!
    expect(srOnly).toHaveTextContent('price drop')
  })

  it('sr-only span provides screen-reader text for "price increase" direction', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow({ direction: 'increase', priceBefore: 0.09, priceAfter: 0.1 })]} />,
    )
    const srOnly = container.querySelector('.pct__row .sr-only')!
    expect(srOnly).toHaveTextContent('price increase')
  })

  it('sr-only span provides screen-reader text for "removed" direction', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow({ direction: 'removed', priceBefore: 0.096, priceAfter: 0 })]} />,
    )
    const srOnly = container.querySelector('.pct__row .sr-only')!
    expect(srOnly).toHaveTextContent('removed SKU')
  })

  it('clickable table row has role="button"', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} onRowClick={vi.fn()} />)
    expect(container.querySelector('.pct__row--clickable')).toHaveAttribute('role', 'button')
  })

  it('non-clickable table row does not have role="button"', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    expect(container.querySelector('.pct__row')).not.toHaveAttribute('role')
  })

  it('clickable table row has descriptive aria-label summarising the change', () => {
    const row = makeRow({ direction: 'drop', priceBefore: 0.1, priceAfter: 0.09 })
    const { container } = render(<PriceChangesTable rows={[row]} onRowClick={vi.fn()} />)
    const tr = container.querySelector('.pct__row--clickable')!
    expect(tr).toHaveAttribute('aria-label', 'Standard_D2s_v5 · westeurope — price drop -10.0%')
  })

  it('clickable table row aria-label for new SKU omits percentage', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} onRowClick={vi.fn()} />)
    const tr = container.querySelector('.pct__row--clickable')!
    expect(tr).toHaveAttribute('aria-label', 'Standard_D2s_v5 · westeurope — new SKU')
  })

  it('clickable mobile card has role="button"', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} onRowClick={vi.fn()} />)
    expect(container.querySelector('.pct__card--clickable')).toHaveAttribute('role', 'button')
  })

  it('clickable mobile card has descriptive aria-label', () => {
    const row = makeRow({ direction: 'increase', priceBefore: 0.09, priceAfter: 0.1 })
    const { container } = render(<PriceChangesTable rows={[row]} onRowClick={vi.fn()} />)
    const card = container.querySelector('.pct__card--clickable')!
    expect(card).toHaveAttribute('aria-label', 'Standard_D2s_v5 · westeurope — price increase +11.1%')
  })

  it('non-clickable mobile card does not have role="button"', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    expect(container.querySelector('.pct__card')).not.toHaveAttribute('role')
  })
})

describe('PriceChangesTable — card layout', () => {
  it('renders a card for each row', () => {
    const rows = [makeRow({ key: 'r1' }), makeRow({ key: 'r2' })]
    const { container } = render(<PriceChangesTable rows={rows} />)
    expect(container.querySelectorAll('.pct__card')).toHaveLength(2)
  })

  it('card shows direction badge and SKU name', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    const card = container.querySelector('.pct__card')!
    expect(card.querySelector('.pct__badge')).toHaveTextContent('★ New')
    expect(card.querySelector('.pct__card-sku')).toHaveTextContent('Standard_D2s_v5')
  })

  it('card shows product name and region', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    const meta = container.querySelector('.pct__card-meta')!
    expect(meta).toHaveTextContent('Virtual Machines Dsv5 Series')
    expect(meta).toHaveTextContent('westeurope')
  })

  it('card shows before and after prices with unit', () => {
    const { container } = render(
      <PriceChangesTable
        rows={[makeRow({ direction: 'drop', priceBefore: 0.1, priceAfter: 0.09 })]}
      />,
    )
    const prices = container.querySelector('.pct__card-prices')!
    expect(prices).toHaveTextContent('$0.10')
    expect(prices).toHaveTextContent('$0.09')
    expect(prices).toHaveTextContent('1 Hour')
  })

  it('card shows dash when there is no before price', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    const prices = container.querySelector('.pct__card-prices')!
    expect(prices).toHaveTextContent('—')
  })

  it('card adds clickable class when onRowClick is provided', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow()]} onRowClick={vi.fn()} />,
    )
    expect(container.querySelector('.pct__card--clickable')).toBeInTheDocument()
  })

  it('card does not add clickable class when onRowClick is absent', () => {
    const { container } = render(<PriceChangesTable rows={[makeRow()]} />)
    expect(container.querySelector('.pct__card--clickable')).not.toBeInTheDocument()
  })

  it('card calls onRowClick when clicked', () => {
    const onRowClick = vi.fn()
    const { container } = render(
      <PriceChangesTable rows={[makeRow()]} onRowClick={onRowClick} />,
    )
    fireEvent.click(container.querySelector('.pct__card--clickable')!)
    expect(onRowClick).toHaveBeenCalledOnce()
    expect(onRowClick).toHaveBeenCalledWith(makeRow())
  })

  it('card triggers onRowClick on Enter key', () => {
    const onRowClick = vi.fn()
    const { container } = render(
      <PriceChangesTable rows={[makeRow()]} onRowClick={onRowClick} />,
    )
    fireEvent.keyDown(container.querySelector('.pct__card--clickable')!, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledOnce()
    expect(onRowClick).toHaveBeenCalledWith(makeRow())
  })

  it('card applies direction-specific CSS class', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow({ direction: 'increase' })]} />,
    )
    expect(container.querySelector('.pct__card--increase')).toBeInTheDocument()
    expect(container.querySelector('.pct__badge--increase')).toBeInTheDocument()
  })
})
