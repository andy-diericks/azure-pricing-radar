import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LastUpdatedBadge } from './LastUpdatedBadge'

describe('LastUpdatedBadge', () => {
  it('renders nothing when both timestamps are null', () => {
    const { container } = render(<LastUpdatedBadge lastUpdatedAt={null} lastCheckedAt={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when lastUpdatedAt is null and lastCheckedAt is omitted', () => {
    const { container } = render(<LastUpdatedBadge lastUpdatedAt={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows legacy "Last updated" text when only lastUpdatedAt is provided', () => {
    render(<LastUpdatedBadge lastUpdatedAt="2026-07-15T17:41:10Z" />)
    expect(screen.getByText('Last updated: 15 Jul 2026, 17:41 UTC')).toBeInTheDocument()
  })

  it('uses the last-updated-badge class', () => {
    const { container } = render(<LastUpdatedBadge lastUpdatedAt="2026-07-15T17:41:10Z" />)
    expect(container.querySelector('.last-updated-badge')).toBeInTheDocument()
  })

  it('shows "Last checked" line when lastCheckedAt is provided', () => {
    render(<LastUpdatedBadge lastUpdatedAt={null} lastCheckedAt="2026-07-19T05:38:00Z" />)
    expect(screen.getByText('Last checked: 19 Jul 2026, 05:38 UTC')).toBeInTheDocument()
  })

  it('shows both timestamps when both are provided', () => {
    render(
      <LastUpdatedBadge
        lastUpdatedAt="2026-07-15T17:41:10Z"
        lastCheckedAt="2026-07-19T05:38:00Z"
      />,
    )
    expect(screen.getByText('Last checked: 19 Jul 2026, 05:38 UTC')).toBeInTheDocument()
    expect(screen.getByText('Prices last changed: 15 Jul 2026, 17:41 UTC')).toBeInTheDocument()
  })

  it('omits "Prices last changed" when lastUpdatedAt is null but lastCheckedAt is set', () => {
    render(<LastUpdatedBadge lastUpdatedAt={null} lastCheckedAt="2026-07-19T05:38:00Z" />)
    expect(screen.queryByText(/prices last changed/i)).not.toBeInTheDocument()
  })
})
