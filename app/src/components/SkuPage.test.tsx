import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { SkuPage } from './SkuPage'
import type { SkuIndex } from '../lib/skuIndex'
import React from 'react'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: ({
    stroke,
    fill,
    fillOpacity,
    dataKey,
  }: {
    stroke: string
    fill: string
    fillOpacity: number
    dataKey?: string
  }) => (
    <div
      data-testid="area"
      data-stroke={stroke}
      data-fill={fill}
      data-fill-opacity={String(fillOpacity)}
      data-key={dataKey}
    />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

const SKU_INDEX: SkuIndex = {
  generatedAt: '2026-07-20T00:00:00Z',
  skus: {
    Standard_D2s_v5: {
      productName: 'Virtual Machines Dsv5 Series',
      regions: [
        { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.096, unitOfMeasure: '1 Hour' },
        { armRegionName: 'northeurope', scope: 'vm-eu-west', retailPrice: 0.102, unitOfMeasure: '1 Hour' },
      ],
      history: [
        { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
      ],
    },
  },
}

const SKU_INDEX_TWO_POINTS: SkuIndex = {
  generatedAt: '2026-07-20T00:00:00Z',
  skus: {
    Standard_D2s_v5: {
      productName: 'Virtual Machines Dsv5 Series',
      regions: [
        { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.088, unitOfMeasure: '1 Hour' },
      ],
      history: [
        { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
        { at: '2026-07-16T12:00:00Z', armRegionName: 'westeurope', retailPrice: 0.088, priceBefore: 0.096, direction: 'changed' },
      ],
    },
  },
}

const SKU_INDEX_NO_HISTORY: SkuIndex = {
  generatedAt: '2026-07-20T00:00:00Z',
  skus: {
    Standard_D2s_v5: {
      productName: 'Virtual Machines Dsv5 Series',
      regions: [
        { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.096, unitOfMeasure: '1 Hour' },
      ],
      history: [],
    },
  },
}

// Two regions, each with 2+ history points — enables compare toggle
const SKU_INDEX_MULTI_REGION: SkuIndex = {
  generatedAt: '2026-07-20T00:00:00Z',
  skus: {
    Standard_D2s_v5: {
      productName: 'Virtual Machines Dsv5 Series',
      regions: [
        { armRegionName: 'westeurope', scope: 'vm-eu-west', retailPrice: 0.088, unitOfMeasure: '1 Hour' },
        { armRegionName: 'northeurope', scope: 'vm-eu-west', retailPrice: 0.095, unitOfMeasure: '1 Hour' },
      ],
      history: [
        { at: '2026-07-15T17:41:10Z', armRegionName: 'westeurope', retailPrice: 0.096, direction: 'added' },
        { at: '2026-07-16T12:00:00Z', armRegionName: 'westeurope', retailPrice: 0.088, priceBefore: 0.096, direction: 'changed' },
        { at: '2026-07-15T17:41:10Z', armRegionName: 'northeurope', retailPrice: 0.102, direction: 'added' },
        { at: '2026-07-16T12:00:00Z', armRegionName: 'northeurope', retailPrice: 0.095, priceBefore: 0.102, direction: 'changed' },
      ],
    },
  },
}

function mockFetch(index: SkuIndex) {
  return function (url: string): Promise<Response> {
    if (url.endsWith('sku-index.json')) {
      return Promise.resolve(new Response(JSON.stringify(index), { status: 200 }))
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }
}

describe('SkuPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch(SKU_INDEX))
    document.title = 'Azure Pricing Radar'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.title = 'Azure Pricing Radar'
  })

  it('shows loading skeleton initially', () => {
    render(<SkuPage family="Standard_D2s_v5" />)
    expect(screen.getByRole('main').querySelector('.sku-page__skeleton')).toBeInTheDocument()
  })

  describe('known SKU', () => {
    it('renders the SKU heading', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Standard_D2s_v5'))
    })

    it('renders the product name', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByText('Virtual Machines Dsv5 Series')).toBeInTheDocument())
    })

    it('renders region prices in a table', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getAllByText('westeurope').length).toBeGreaterThan(0))
      expect(screen.getByText('northeurope')).toBeInTheDocument()
      expect(screen.getByText('$0.096')).toBeInTheDocument()
      expect(screen.getByText('$0.102')).toBeInTheDocument()
    })

    it('sets document title for known SKU', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(document.title).toBe('Standard_D2s_v5 | Azure Pricing Radar'))
    })

    it('sets og:title for known SKU', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
        expect(ogTitle).toBe('Standard_D2s_v5 | Azure Pricing Radar')
      })
    })

    it('sets og:description containing product name', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => {
        const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
        expect(ogDesc).toContain('Virtual Machines Dsv5 Series')
      })
    })

    it('sets og:url containing the family name', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => {
        const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content')
        expect(ogUrl).toContain('Standard_D2s_v5')
      })
    })

    it('shows a back link to home', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => {
        const backLinks = screen.getAllByRole('link', { name: /back to price changes/i })
        expect(backLinks.length).toBeGreaterThan(0)
      })
    })
  })

  describe('unknown SKU (off-ramp)', () => {
    it('shows the off-ramp heading', async () => {
      render(<SkuPage family="Unknown_SKU_XYZ" />)
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("We don't track this SKU yet"),
      )
    })

    it('shows the SKU family name in the off-ramp body', async () => {
      render(<SkuPage family="Unknown_SKU_XYZ" />)
      await waitFor(() => expect(screen.getByText('Unknown_SKU_XYZ')).toBeInTheDocument())
    })

    it('links to the GitHub issue template', async () => {
      render(<SkuPage family="Unknown_SKU_XYZ" />)
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /request tracking/i })
        expect(link).toHaveAttribute('href', expect.stringContaining('github.com'))
        expect(link).toHaveAttribute('href', expect.stringContaining('Unknown_SKU_XYZ'))
      })
    })

    it('shows a back link to home in the off-ramp', async () => {
      render(<SkuPage family="Unknown_SKU_XYZ" />)
      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to price changes/i })
        expect(backLink).toBeInTheDocument()
      })
    })

    it('sets document title for unknown SKU', async () => {
      render(<SkuPage family="Unknown_SKU_XYZ" />)
      await waitFor(() => expect(document.title).toBe('Unknown SKU | Azure Pricing Radar'))
    })

    it('sets og:description mentioning the family for unknown SKU', async () => {
      render(<SkuPage family="Unknown_SKU_XYZ" />)
      await waitFor(() => {
        const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
        expect(ogDesc).toContain('Unknown_SKU_XYZ')
      })
    })
  })

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() =>
        expect(screen.getByText(/failed to load sku data/i)).toBeInTheDocument(),
      )
    })
  })

  describe('price history section', () => {
    it('shows single-point display when SKU has exactly 1 history point', async () => {
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() =>
        expect(screen.getByTestId('sku-history-single')).toBeInTheDocument(),
      )
      expect(screen.getByText('$0.096 / 1 Hour')).toBeInTheDocument()
      expect(screen.getAllByText('westeurope').length).toBeGreaterThan(0)
      expect(screen.getByText('15 Jul 2026')).toBeInTheDocument()
      expect(screen.getByText(/not enough history yet/i)).toBeInTheDocument()
    })

    it('renders area chart when SKU has 2+ history points', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_TWO_POINTS))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() =>
        expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument(),
      )
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
      expect(screen.queryByTestId('sku-history-single')).not.toBeInTheDocument()
    })

    it('shows drop color when last history point is a price decrease', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_TWO_POINTS))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() =>
        expect(screen.getByTestId('area')).toBeInTheDocument(),
      )
      const area = screen.getByTestId('area')
      expect(area.dataset.stroke).toBe('#34D399')
    })

    it('shows empty state when SKU has 0 history points for primary region', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_NO_HISTORY))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() =>
        expect(screen.getByTestId('sku-history-empty')).toBeInTheDocument(),
      )
      expect(screen.getByText(/no price changes recorded yet/i)).toBeInTheDocument()
    })
  })

  describe('region comparison', () => {
    it('compare toggle is not shown when only one region has history', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_TWO_POINTS))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: /compare all regions/i })).not.toBeInTheDocument()
    })

    it('compare toggle is shown when multiple regions have history and 2+ chart points', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /compare all regions/i })).toBeInTheDocument(),
      )
    })

    it('clicking compare toggle shows multiple Area series', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByRole('button', { name: /compare all regions/i })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /compare all regions/i }))
      const areas = screen.getAllByTestId('area')
      expect(areas.length).toBe(2)
    })

    it('uses palette colors for each region in compare mode', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByRole('button', { name: /compare all regions/i })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /compare all regions/i }))
      const areas = screen.getAllByTestId('area')
      expect(areas[0].dataset.stroke).toBe('#38BDF8')
      expect(areas[1].dataset.stroke).toBe('#FBBF24')
    })

    it('shows cheapest region badge in compare mode', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByRole('button', { name: /compare all regions/i })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /compare all regions/i }))
      const badge = screen.getByTestId('cheapest-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('westeurope')
      expect(badge).toHaveTextContent('$0.088')
    })

    it('heading shows region count in compare mode', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByRole('button', { name: /compare all regions/i })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /compare all regions/i }))
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('2 regions')
    })

    it('can deactivate compare mode and returns to single-region chart', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByRole('button', { name: /compare all regions/i })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /compare all regions/i }))
      expect(screen.getByRole('button', { name: /single region/i })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /single region/i }))
      expect(screen.queryByTestId('cheapest-badge')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /compare all regions/i })).toBeInTheDocument()
  describe('region selector', () => {
    it('does not render region selector when history has only one region', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_TWO_POINTS))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      expect(screen.queryByRole('group', { name: /select regions/i })).not.toBeInTheDocument()
    })

    it('renders region selector with one button per history region', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      const selector = screen.getByRole('group', { name: /select regions/i })
      expect(within(selector).getAllByRole('button').length).toBe(2)
      expect(within(selector).getByRole('button', { name: 'westeurope' })).toBeInTheDocument()
      expect(within(selector).getByRole('button', { name: 'northeurope' })).toBeInTheDocument()
    })

    it('selects the cheapest region by default', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      expect(screen.getByRole('button', { name: 'westeurope' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'northeurope' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('adds a second region when its button is clicked', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'northeurope' }))
      expect(screen.getAllByTestId('area').length).toBe(2)
      expect(screen.getByRole('button', { name: /northeurope/i })).toHaveAttribute('aria-pressed', 'true')
    })

    it('removes a region when its active button is clicked (if another remains)', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'northeurope' })) // add
      fireEvent.click(screen.getByRole('button', { name: 'northeurope' })) // remove
      expect(screen.getAllByTestId('area').length).toBe(1)
      expect(screen.getByRole('button', { name: /northeurope/i })).toHaveAttribute('aria-pressed', 'false')
    })

    it('cannot deselect the last selected region', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'westeurope' }))
      expect(screen.getByRole('button', { name: 'westeurope' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getAllByTestId('area').length).toBe(1)
    })

    it('uses palette colors when multiple regions are selected', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'northeurope' }))
      const areas = screen.getAllByTestId('area')
      expect(areas.length).toBe(2)
      const strokes = areas.map((a) => a.dataset.stroke)
      expect(strokes).toContain('#38BDF8')
      expect(strokes).toContain('#FBBF24')
    })

    it('shows heading with all selected region names', async () => {
      vi.stubGlobal('fetch', mockFetch(SKU_INDEX_MULTI_REGION))
      render(<SkuPage family="Standard_D2s_v5" />)
      await waitFor(() => expect(screen.getByTestId('sku-history-chart')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'northeurope' }))
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('westeurope · northeurope')
    })
  })
})
