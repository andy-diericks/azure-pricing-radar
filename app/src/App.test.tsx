import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the site title', () => {
    render(<App />)
    expect(screen.getByText('Azure Pricing Radar')).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /price changes, tracked/i })).toBeInTheDocument()
  })

  it('renders the price direction legend', () => {
    render(<App />)
    expect(screen.getByText(/drop/i)).toBeInTheDocument()
    expect(screen.getByText(/increase/i)).toBeInTheDocument()
    expect(screen.getByText(/new sku/i)).toBeInTheDocument()
  })
})
