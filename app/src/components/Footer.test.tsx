import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'

describe('Footer', () => {
  it('states the data source and cadence', () => {
    render(<Footer />)
    expect(screen.getByText(/checked every 6 hours/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /azure retail prices api/i })).toBeInTheDocument()
  })

  it('declares independence from Microsoft', () => {
    render(<Footer />)
    expect(screen.getByText(/not affiliated with microsoft/i)).toBeInTheDocument()
  })

  it('links to the open-source repository', () => {
    render(<Footer />)
    const source = screen.getByRole('link', { name: /source & open data on github/i })
    expect(source).toHaveAttribute('href', 'https://github.com/andy-diericks/azure-pricing-radar')
  })
})
