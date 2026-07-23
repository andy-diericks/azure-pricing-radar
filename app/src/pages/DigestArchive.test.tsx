import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DigestArchive } from './DigestArchive'
import type { DigestData } from '../lib/digest'
import type { DigestManifestEntry } from '../lib/loadDigests'

const MANIFEST: DigestManifestEntry[] = [
  { date: '2026-07-15', path: 'digests/2026-07-15.json' },
]

const DIGEST_NO_CHANGES: DigestData = {
  date: '2026-07-15',
  totalDrops: 0,
  totalIncreases: 0,
  totalNewSkus: 9904,
  totalRemoved: 0,
  sections: [
    {
      scope: 'vm-eu-west',
      displayName: 'Virtual Machines · West Europe',
      drops: 0,
      increases: 0,
      newSkus: 9904,
      removed: 0,
      topMovers: [],
    },
  ],
}

const DIGEST_WITH_MOVERS: DigestData = {
  date: '2026-07-15',
  totalDrops: 2,
  totalIncreases: 1,
  totalNewSkus: 0,
  totalRemoved: 0,
  sections: [
    {
      scope: 'vm-eu-west',
      displayName: 'Virtual Machines · West Europe',
      drops: 2,
      increases: 1,
      newSkus: 0,
      removed: 0,
      topMovers: [
        {
          skuName: 'Standard_D2s_v5',
          productName: 'Virtual Machines Dsv5 Series',
          armRegionName: 'westeurope',
          regionDisplay: 'West Europe',
          priceBefore: 0.1,
          priceAfter: 0.09,
          unitOfMeasure: '1 Hour',
          pctChange: -10.0,
          direction: 'drop',
        },
        {
          skuName: 'Standard_D4s_v5',
          productName: 'Virtual Machines Dsv5 Series',
          armRegionName: 'westeurope',
          regionDisplay: 'West Europe',
          priceBefore: 0.2,
          priceAfter: 0.18,
          unitOfMeasure: '1 Hour',
          pctChange: -10.0,
          direction: 'drop',
        },
        {
          skuName: 'Standard_D8s_v5',
          productName: 'Virtual Machines Dsv5 Series',
          armRegionName: 'westeurope',
          regionDisplay: 'West Europe',
          priceBefore: 0.35,
          priceAfter: 0.385,
          unitOfMeasure: '1 Hour',
          pctChange: 10.0,
          direction: 'increase',
        },
      ],
    },
  ],
}

function makeMockFetch(digest: DigestData) {
  return (url: string): Promise<Response> => {
    if (url.includes('manifest.json')) {
      return Promise.resolve(new Response(JSON.stringify(MANIFEST), { status: 200 }))
    }
    if (url.includes('2026-07-15.json')) {
      return Promise.resolve(new Response(JSON.stringify(digest), { status: 200 }))
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }
}

describe('DigestArchive', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading skeletons initially', () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    render(<DigestArchive />)
    expect(screen.getByLabelText('Loading digests')).toBeInTheDocument()
  })

  it('renders the page heading', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_NO_CHANGES))
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('Daily digests')).toBeInTheDocument())
  })

  it('renders the home link in the header', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_NO_CHANGES))
    render(<DigestArchive />)
    expect(screen.getByText('Azure Pricing Radar')).toBeInTheDocument()
  })

  it('shows empty state when no digests exist', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
    )
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('No digests yet')).toBeInTheDocument())
  })

  it('shows error state when fetch fails', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('Error', { status: 500 })),
    )
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('Failed to load digests')).toBeInTheDocument())
  })

  it('renders the digest date', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_NO_CHANGES))
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('15 Jul 2026')).toBeInTheDocument())
  })

  it('renders the headline with new SKU count', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_NO_CHANGES))
    render(<DigestArchive />)
    await waitFor(() =>
      expect(screen.getByText('9,904 new SKUs')).toBeInTheDocument(),
    )
  })

  it('renders drop count badge', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_WITH_MOVERS))
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('2 drops')).toBeInTheDocument())
  })

  it('renders increase count badge', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_WITH_MOVERS))
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('1 increase')).toBeInTheDocument())
  })

  it('renders top movers', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_WITH_MOVERS))
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('Standard_D2s_v5')).toBeInTheDocument())
  })

  it('renders mover percentage with correct sign', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_WITH_MOVERS))
    render(<DigestArchive />)
    await waitFor(() => {
      const dropPcts = screen.getAllByText('-10.0%')
      expect(dropPcts.length).toBeGreaterThan(0)
    })
  })

  it('renders increase mover with + sign', async () => {
    vi.stubGlobal('fetch', makeMockFetch(DIGEST_WITH_MOVERS))
    render(<DigestArchive />)
    await waitFor(() => expect(screen.getByText('+10.0%')).toBeInTheDocument())
  })

  it('renders the subtitle "Daily digest archive"', () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    render(<DigestArchive />)
    expect(screen.getByText('Daily digest archive')).toBeInTheDocument()
  })
})
