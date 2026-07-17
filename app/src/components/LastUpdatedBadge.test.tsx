import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LastUpdatedBadge } from './LastUpdatedBadge'

describe('LastUpdatedBadge', () => {
  it('renders nothing when lastUpdatedAt is null', () => {
    const { container } = render(<LastUpdatedBadge lastUpdatedAt={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the formatted timestamp', () => {
    render(<LastUpdatedBadge lastUpdatedAt="2026-07-15T17:41:10Z" />)
    expect(screen.getByText('Last updated: 15 Jul 2026, 17:41 UTC')).toBeInTheDocument()
  })

  it('uses the last-updated-badge class', () => {
    const { container } = render(<LastUpdatedBadge lastUpdatedAt="2026-07-15T17:41:10Z" />)
    expect(container.querySelector('.last-updated-badge')).toBeInTheDocument()
  })
})
