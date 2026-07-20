import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import App from './App'
import type { DiffFile, DiffManifestEntry } from './types'

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

  it('has a skip link with href pointing to main-content', () => {
    const { container } = render(<App />)
    const skip = container.querySelector('a.skip-link')
    expect(skip).toBeInTheDocument()
    expect(skip).toHaveAttribute('href', '#main-content')
  })

  it('skip link is the first focusable element in the document', () => {
    const { container } = render(<App />)
    const focusable = container.querySelectorAll('a, button, input, select, textarea, [tabindex]')
    expect(focusable[0]).toHaveClass('skip-link')
  })

  it('renders the section heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /recent price changes/i })).toBeInTheDocument()
  })

  it('shows loading skeleton initially', () => {
    render(<App />)
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('renders price change rows after load', async () => {
    render(<App />)
    await waitFor(() => expect(screen.queryByTestId('table-skeleton')).not.toBeInTheDocument())
    expect(screen.getAllByText('Standard_D2s_v5')[0]).toBeInTheDocument()
  })

  it('shows the last-updated badge after load', async () => {
    render(<App />)
    await waitFor(() => expect(screen.queryByTestId('table-skeleton')).not.toBeInTheDocument())
    // mockFetch returns 404 for last-checked.json, so badge falls back to "Last updated:"
    expect(screen.getByText(/last updated:/i)).toBeInTheDocument()
  })

  it('shows error state on fetch failure', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    render(<App />)
    await waitFor(() => expect(screen.getByText(/failed to load price changes/i)).toBeInTheDocument())
  })

  it('navigates to the SKU page when a row is clicked', async () => {
    const { container } = render(<App />)
    await waitFor(() => expect(screen.queryByTestId('table-skeleton')).not.toBeInTheDocument())
    fireEvent.click(container.querySelector('.pct__row--clickable')!)
    expect(window.location.hash).toBe('#/sku/Standard_D2s_v5')
  })
})
