import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SkuPage } from './SkuPage'
import type { SkuIndex } from '../lib/skuIndex'

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

function mockFetch(url: string): Promise<Response> {
  if (url.endsWith('sku-index.json')) {
    return Promise.resolve(new Response(JSON.stringify(SKU_INDEX), { status: 200 }))
  }
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}

describe('SkuPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
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
      await waitFor(() => expect(screen.getByText('westeurope')).toBeInTheDocument())
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
})
