import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { WeeklyDigest } from './WeeklyDigest'
import type { DigestData } from '../lib/digest'
import type { DigestManifestEntry } from '../lib/loadDigests'

// Pin current date to 2026-07-24 (ISO week 30, Mon 20 – Sun 26 Jul)
const NOW = new Date('2026-07-24T12:00:00Z')

const MANIFEST_W30: DigestManifestEntry[] = [
  { date: '2026-07-21', path: 'digests/2026-07-21.json' },
]

const DIGEST_W30: DigestData = {
  date: '2026-07-21',
  totalDrops: 2,
  totalIncreases: 1,
  totalNewSkus: 0,
  totalRemoved: 3,
  sections: [
    {
      scope: 'vm-eu-west',
      displayName: 'Virtual Machines · West Europe',
      drops: 2,
      increases: 1,
      newSkus: 0,
      removed: 3,
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

// Digest from a prior week — must NOT appear on the weekly page
const MANIFEST_OLD: DigestManifestEntry[] = [
  { date: '2026-07-15', path: 'digests/2026-07-15.json' },
]

const DIGEST_OLD: DigestData = {
  date: '2026-07-15',
  totalDrops: 0,
  totalIncreases: 0,
  totalNewSkus: 9904,
  totalRemoved: 0,
  sections: [],
}

function makeMockFetch(manifest: DigestManifestEntry[], digest: DigestData) {
  return (url: string): Promise<Response> => {
    if (url.includes('manifest.json')) {
      return Promise.resolve(new Response(JSON.stringify(manifest), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify(digest), { status: 200 }))
  }
}

// Use shouldAdvanceTime so fake Date.now works but real async (Promises) still resolves
function useFakeDate(date: Date) {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(date)
}

describe('WeeklyDigest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows loading skeleton initially', () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    render(<WeeklyDigest />)
    expect(screen.getByLabelText('Loading weekly digest')).toBeInTheDocument()
  })

  it('renders the page heading', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_W30, DIGEST_W30))
    render(<WeeklyDigest />)
    await waitFor(() => expect(screen.getByText('This week in Azure pricing')).toBeInTheDocument())
  })

  it('shows empty state when no digests fall in the current week', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_OLD, DIGEST_OLD))
    render(<WeeklyDigest />)
    await waitFor(() =>
      expect(screen.getByText('No pricing data this week')).toBeInTheDocument(),
    )
  })

  it('shows error state when fetch fails', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('Error', { status: 500 })),
    )
    render(<WeeklyDigest />)
    await waitFor(() =>
      expect(screen.getByText('Failed to load weekly digest')).toBeInTheDocument(),
    )
  })

  it('renders summary card with correct counts', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_W30, DIGEST_W30))
    render(<WeeklyDigest />)
    await waitFor(() => expect(screen.getByTestId('weekly-summary')).toBeInTheDocument())
    const summary = screen.getByTestId('weekly-summary')
    expect(summary.textContent).toContain('2')
    expect(summary.textContent).toContain('1')
  })

  it('renders biggest movers section with SKU names', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_W30, DIGEST_W30))
    render(<WeeklyDigest />)
    await waitFor(() => {
      const matches = screen.getAllByText('Standard_D2s_v5')
      expect(matches.length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Biggest movers this week')).toBeInTheDocument()
  })

  it('renders drop percentage with correct sign', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_W30, DIGEST_W30))
    render(<WeeklyDigest />)
    await waitFor(() => {
      const dropPcts = screen.getAllByText('-10.0%')
      expect(dropPcts.length).toBeGreaterThan(0)
    })
  })

  it('renders by-service section heading', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_W30, DIGEST_W30))
    render(<WeeklyDigest />)
    await waitFor(() => {
      const matches = screen.getAllByText('Virtual Machines · West Europe')
      expect(matches.length).toBeGreaterThan(0)
    })
    expect(screen.getByText('By service')).toBeInTheDocument()
  })

  it('renders the days-with-data note', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_W30, DIGEST_W30))
    render(<WeeklyDigest />)
    await waitFor(() =>
      expect(screen.getByText(/Based on 1 day of data/)).toBeInTheDocument(),
    )
  })

  it('renders the archive link', async () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', makeMockFetch(MANIFEST_W30, DIGEST_W30))
    render(<WeeklyDigest />)
    await waitFor(() =>
      expect(screen.getByText('View daily digest archive →')).toBeInTheDocument(),
    )
  })

  it('renders subtitle "Weekly rollup"', () => {
    useFakeDate(NOW)
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    render(<WeeklyDigest />)
    expect(screen.getByText('Weekly rollup')).toBeInTheDocument()
  })
})
