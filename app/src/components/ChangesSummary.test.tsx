import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChangesSummary } from './ChangesSummary'
import type { TableRow } from '../types'

function makeRow(direction: TableRow['direction'], key: string): TableRow {
  return {
    key,
    itemKey: key,
    direction,
    scope: 'vm-eu-west',
    productName: 'Virtual Machines',
    skuName: `Standard_D${key}`,
    unitOfMeasure: '1 Hour',
    armRegionName: 'westeurope',
    priceBefore: direction === 'new' ? null : 0.1,
    priceAfter: 0.09,
    at: '2026-07-15T17:41:10Z',
  }
}

describe('ChangesSummary', () => {
  it('renders nothing when rows is empty', () => {
    const { container } = render(<ChangesSummary rows={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders correct counts for each direction', () => {
    const rows = [
      makeRow('drop', '1'),
      makeRow('drop', '2'),
      makeRow('drop', '3'),
      makeRow('increase', '4'),
      makeRow('new', '5'),
      makeRow('new', '6'),
      makeRow('new', '7'),
      makeRow('new', '8'),
      makeRow('new', '9'),
      makeRow('new', '10'),
    ]
    render(<ChangesSummary rows={rows} />)
    expect(screen.getByText('3 drops')).toBeInTheDocument()
    expect(screen.getByText('1 increase')).toBeInTheDocument()
    expect(screen.getByText('6 new SKUs')).toBeInTheDocument()
  })

  it('omits zero-count directions', () => {
    const rows = [makeRow('drop', '1'), makeRow('drop', '2')]
    render(<ChangesSummary rows={rows} />)
    expect(screen.getByText('2 drops')).toBeInTheDocument()
    expect(screen.queryByText(/increase/)).not.toBeInTheDocument()
    expect(screen.queryByText(/new SKU/)).not.toBeInTheDocument()
    expect(screen.queryByText(/removed/)).not.toBeInTheDocument()
  })

  it('uses singular labels for single-item counts', () => {
    const rows = [makeRow('drop', '1'), makeRow('new', '2'), makeRow('removed', '3')]
    render(<ChangesSummary rows={rows} />)
    expect(screen.getByText('1 drop')).toBeInTheDocument()
    expect(screen.getByText('1 new SKU')).toBeInTheDocument()
    expect(screen.getByText('1 removed')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading prop is true', () => {
    const { container } = render(<ChangesSummary rows={[]} loading={true} />)
    expect(container.querySelector('.csm--loading')).toBeInTheDocument()
    expect(container.querySelectorAll('.csm__skeleton')).toHaveLength(3)
  })

  it('applies direction color classes', () => {
    const rows = [makeRow('drop', '1'), makeRow('increase', '2')]
    const { container } = render(<ChangesSummary rows={rows} />)
    expect(container.querySelector('.csm__item--drop')).toBeInTheDocument()
    expect(container.querySelector('.csm__item--increase')).toBeInTheDocument()
  })
})
