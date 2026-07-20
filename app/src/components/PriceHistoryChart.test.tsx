import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PriceHistoryChart } from './PriceHistoryChart'
import type { TableRow } from '../types'
import type { DiffFile, DiffManifestEntry } from '../types'
import React from 'react'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: ({ stroke, fill, fillOpacity }: { stroke: string; fill: string; fillOpacity: number }) => (
    <div data-testid="area" data-stroke={stroke} data-fill={fill} data-fill-opacity={fillOpacity} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

const MANIFEST: DiffManifestEntry[] = [
  { path: 'diffs/2026-07-15/1741-vm-eu-west.json', scope: 'vm-eu-west', date: '2026-07-15' },
  { path: 'diffs/2026-07-16/1200-vm-eu-west.json', scope: 'vm-eu-west', date: '2026-07-16' },
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

const DIFF2: DiffFile = {
  scope: 'vm-eu-west',
  at: '2026-07-16T12:00:00Z',
  added: [],
  removed: [],
  changed: [
    {
      key: 'K1',
      before: { key: 'K1', retailPrice: 0.096, unitPrice: 0.096, unitOfMeasure: '1 Hour', productName: 'Virtual Machines Dsv5 Series', skuName: 'Standard_D2s_v5', meterName: 'D2s v5', armRegionName: 'westeurope' },
      after: { key: 'K1', retailPrice: 0.088, unitPrice: 0.088, unitOfMeasure: '1 Hour', productName: 'Virtual Machines Dsv5 Series', skuName: 'Standard_D2s_v5', meterName: 'D2s v5', armRegionName: 'westeurope' },
    },
  ],
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
  if (url === '/data/diffs/2026-07-16/1200-vm-eu-west.json') {
    return Promise.resolve(new Response(JSON.stringify(DIFF2), { status: 200 }))
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

  it('focuses the close button on mount', () => {
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }))
  })

  it('shows skeleton loading state initially', () => {
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/loading chart/i)).toBeInTheDocument()
  })

  it('renders the chart after data loads', async () => {
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders an Area with fill matching stroke at 12% opacity', async () => {
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    const area = screen.getByTestId('area')
    expect(area.dataset.fill).toBe(area.dataset.stroke)
    expect(area.dataset.fillOpacity).toBe('0.12')
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

  it('renders empty state when history array is empty', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      if (url === '/data/diffs/manifest.json') {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/not enough history yet/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/check back after the next data fetch/i)).toBeInTheDocument()
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument()
  })

  it('renders empty state when history has exactly 1 point', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      if (url === '/data/diffs/manifest.json') {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ path: 'diffs/2026-07-15/1741-vm-eu-west.json', scope: 'vm-eu-west', date: '2026-07-15' }]),
            { status: 200 },
          ),
        )
      }
      if (url === '/data/diffs/2026-07-15/1741-vm-eu-west.json') {
        return Promise.resolve(new Response(JSON.stringify(DIFF), { status: 200 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/not enough history yet/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/check back after the next data fetch/i)).toBeInTheDocument()
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument()
  })

  it('shows plain-language error state when fetch fails', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    render(<PriceHistoryChart row={ROW} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/unable to load price history/i)).toBeInTheDocument(),
    )
  })
})
