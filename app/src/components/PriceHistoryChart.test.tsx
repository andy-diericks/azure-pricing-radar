import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PriceHistoryChart } from './PriceHistoryChart'
import type { TableRow } from '../types'
import type { DiffFile, DiffManifestEntry } from '../types'
import React from 'react'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

const MANIFEST: DiffManifestEntry[] = [
  { path: 'diffs/2026-07-15/1741-vm-eu-west.json', scope: 'vm-eu-west', date: '2026-07-15' },
]

const DIFF: DiffFile = {
  scope: 'vm-eu-west',
  at: '2026-07-15T17:41:10Z',
  added: [
    {
      key: 'K1',
      retailPrice: 0.096,
      unitPrice: 0.096,
      unitOfMeasure: '1 Hour',
      productName: 'Virtual Machines Dsv5 Series',
      skuName: 'Standard_D2s_v5',
      meterName: 'D2s v5',
      armRegionName: 'westeurope',
    },
  ],
  removed: [],
  changed: [],
}

const ROW: TableRow = {
  key: 'vm-eu-west:added:K1',
  itemKey: 'K1',
  direction: 'new',
  scope: 'vm-eu-west',
  productName: 'Virtual Machines Dsv5 Series',
  skuName: 'Standard_D2s_v5',
  unitOfMeasure: '1 Hour',
  armRegionName: 'westeurope',
  priceBefore: null,
  priceAfter: 0.096,
  at: '2026-07-15T17:41:10Z',
}

function mockFetch(url: string): Promise<Response> {
  if (url === '/data/diffs/manifest.json') {
    return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
  }
  if (url === '/data/diffs/2026-07-15/1741-vm-eu-west.json') {
    return Promise.resolve(new Response(JSON.stringify(DIFF), { status: 200 }))
  }
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}

describe('PriceHistoryChart', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the dialog with the SKU name', () => {
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Standard_D2s_v5')).toBeInTheDocument()
  })

  it('shows skeleton loading state initially', () => {
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/loading chart/i)).toBeInTheDocument()
  })

  it('renders the chart after data loads', async () => {
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<PriceHistoryChart row={ROW} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<PriceHistoryChart row={ROW} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the overlay backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(<PriceHistoryChart row={ROW} onClose={onClose} />)
    const overlay = container.querySelector('.phc__overlay')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows empty state when SKU has no history', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      if (url === '/data/diffs/manifest.json') {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/no price history recorded/i)).toBeInTheDocument(),
    )
  })

  it('shows plain-language error state when fetch fails', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/unable to load price history/i)).toBeInTheDocument(),
    )
  })
})
