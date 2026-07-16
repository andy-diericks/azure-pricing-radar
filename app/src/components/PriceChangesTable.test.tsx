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

describe('PriceChangesTable', () => {
  it('shows empty state when no rows', () => {
    render(<PriceChangesTable rows={[]} />)
    expect(screen.getByText(/no price changes/i)).toBeInTheDocument()
  })

  it('renders column headers', () => {
    render(<PriceChangesTable rows={[makeRow()]} />)
    expect(screen.getByRole('columnheader', { name: /change/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /sku/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /product/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /region/i })).toBeInTheDocument()
  })

  it('renders a new SKU row with correct badge and price', () => {
    render(<PriceChangesTable rows={[makeRow()]} />)
    expect(screen.getByText('Standard_D2s_v5')).toBeInTheDocument()
    expect(screen.getByText(/★ New/)).toBeInTheDocument()
    expect(screen.getByText('$0.096')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders a price drop row with before and after prices', () => {
    render(
      <PriceChangesTable
        rows={[makeRow({ direction: 'drop', priceBefore: 0.1, priceAfter: 0.09 })]}
      />,
    )
    expect(screen.getByText(/▼ Drop/)).toBeInTheDocument()
    expect(screen.getByText('$0.10')).toBeInTheDocument()
    expect(screen.getByText('$0.09')).toBeInTheDocument()
  })

  it('renders a price increase row', () => {
    render(
      <PriceChangesTable
        rows={[makeRow({ direction: 'increase', priceBefore: 0.09, priceAfter: 0.1 })]}
      />,
    )
    expect(screen.getByText(/▲ Increase/)).toBeInTheDocument()
    expect(screen.getByText('$0.09')).toBeInTheDocument()
    expect(screen.getByText('$0.10')).toBeInTheDocument()
  })

  it('renders a removed SKU row', () => {
    render(
      <PriceChangesTable
        rows={[makeRow({ direction: 'removed', priceBefore: 0.096, priceAfter: 0 })]}
      />,
    )
    expect(screen.getByText(/✕ Removed/)).toBeInTheDocument()
    expect(screen.getByText('$0.096')).toBeInTheDocument()
  })

  it('renders multiple rows', () => {
    const rows = [
      makeRow({ key: 'r1', direction: 'new', skuName: 'SKU-A' }),
      makeRow({ key: 'r2', direction: 'drop', skuName: 'SKU-B', priceBefore: 0.5, priceAfter: 0.4 }),
    ]
    render(<PriceChangesTable rows={rows} />)
    expect(screen.getByText('SKU-A')).toBeInTheDocument()
    expect(screen.getByText('SKU-B')).toBeInTheDocument()
  })

  it('applies the correct CSS class per direction', () => {
    const { container } = render(
      <PriceChangesTable rows={[makeRow({ direction: 'drop' })]} />,
    )
    expect(container.querySelector('.pct__badge--drop')).toBeInTheDocument()
    expect(container.querySelector('.pct__row--drop')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when a row is clicked', () => {
    const onRowClick = vi.fn()
    render(<PriceChangesTable rows={[makeRow()]} onRowClick={onRowClick} />)
    fireEvent.click(screen.getByText('Standard_D2s_v5'))
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
