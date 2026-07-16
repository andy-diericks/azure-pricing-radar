import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import App from './App'
import type { DiffFile, DiffManifestEntry, TableRow } from './types'

vi.mock('./components/PriceHistoryChart', () => ({
  PriceHistoryChart: ({ row, onClose }: { row: TableRow; onClose: () => void }) => (
    <div data-testid="price-history-chart">
      <span>{row.skuName}</span>
      <button onClick={onClose}>Close chart</button>
    </div>
  ),
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
      productName: 'Virtual Machines Dsv5',
      skuName: 'Standard_D2s_v5',
      meterName: 'D2s v5',
      armRegionName: 'westeurope',
    },
  ],
  removed: [],
  changed: [],
}

function mockFetch(url: string): Promise<Response> {
  if (url === '/data/diffs/manifest.json') {
    return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
  }
  if (url.endsWith('1741-vm-eu-west.json')) {
    return Promise.resolve(new Response(JSON.stringify(DIFF), { status: 200 }))
  }
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the site title', () => {
    render(<App />)
    expect(screen.getByText('Azure Pricing Radar')).toBeInTheDocument()
  })

  it('renders the section heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /recent price changes/i })).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<App />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders price change rows after load', async () => {
    render(<App />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    expect(screen.getByText('Standard_D2s_v5')).toBeInTheDocument()
  })

  it('shows error state on fetch failure', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    render(<App />)
    await waitFor(() => expect(screen.getByText(/failed to load data/i)).toBeInTheDocument())
  })

  it('opens the history chart when a row is clicked', async () => {
    render(<App />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Standard_D2s_v5'))
    expect(screen.getByTestId('price-history-chart')).toBeInTheDocument()
  })

  it('closes the history chart when onClose is called', async () => {
    render(<App />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Standard_D2s_v5'))
    expect(screen.getByTestId('price-history-chart')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close chart/i }))
    expect(screen.queryByTestId('price-history-chart')).not.toBeInTheDocument()
  })
})
