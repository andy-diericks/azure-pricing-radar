import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPanel } from './FilterPanel'
import { EMPTY_FILTERS } from '../lib/filters'
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

const TWO_SERVICE_ROWS: TableRow[] = [
  makeRow({ key: 'k1', scope: 'vm-eu-west', armRegionName: 'westeurope' }),
  makeRow({ key: 'k2', scope: 'storage-eu-west', armRegionName: 'northeurope' }),
]

describe('FilterPanel', () => {
  it('returns null when rows is empty', () => {
    const { container } = render(
      <FilterPanel rows={[]} filters={EMPTY_FILTERS} onChange={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders direction checkboxes for all 4 directions', () => {
    render(<FilterPanel rows={[makeRow()]} filters={EMPTY_FILTERS} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: /drop/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /increase/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /new sku/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /removed/i })).toBeInTheDocument()
  })

  it('hides service group when only 1 unique service', () => {
    render(<FilterPanel rows={[makeRow()]} filters={EMPTY_FILTERS} onChange={vi.fn()} />)
    expect(screen.queryByText('Service')).not.toBeInTheDocument()
  })

  it('shows service checkboxes when 2+ unique services', () => {
    render(<FilterPanel rows={TWO_SERVICE_ROWS} filters={EMPTY_FILTERS} onChange={vi.fn()} />)
    expect(screen.getByText('Service')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /vm-eu-west/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /storage-eu-west/i })).toBeInTheDocument()
  })

  it('shows region checkboxes when 2+ unique regions', () => {
    render(<FilterPanel rows={TWO_SERVICE_ROWS} filters={EMPTY_FILTERS} onChange={vi.fn()} />)
    expect(screen.getByText('Region')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /westeurope/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /northeurope/i })).toBeInTheDocument()
  })

  it('calls onChange when a direction checkbox is toggled', () => {
    const onChange = vi.fn()
    render(<FilterPanel rows={[makeRow()]} filters={EMPTY_FILTERS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /drop/i }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedDirections: ['drop'] }),
    )
  })

  it('calls onChange when a service checkbox is toggled', () => {
    const onChange = vi.fn()
    render(<FilterPanel rows={TWO_SERVICE_ROWS} filters={EMPTY_FILTERS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /vm-eu-west/i }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedServices: ['vm-eu-west'] }),
    )
  })

  it('unchecks a direction that was already selected', () => {
    const onChange = vi.fn()
    const filters = { ...EMPTY_FILTERS, selectedDirections: ['drop' as const] }
    render(<FilterPanel rows={[makeRow()]} filters={filters} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /drop/i }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedDirections: [] }),
    )
  })

  it('calls onChange when magnitude slider changes', () => {
    const onChange = vi.fn()
    render(<FilterPanel rows={[makeRow()]} filters={EMPTY_FILTERS} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ minMagnitude: 15 }),
    )
  })

  it('displays the current magnitude value', () => {
    const filters = { ...EMPTY_FILTERS, minMagnitude: 10 }
    render(<FilterPanel rows={[makeRow()]} filters={filters} onChange={vi.fn()} />)
    expect(screen.getByText('≥10%')).toBeInTheDocument()
  })
})
