import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('renders the search input with placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    expect(screen.getByRole('searchbox', { name: /search skus/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search SKUs…')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    render(<SearchInput value="Standard" onChange={vi.fn()} />)
    expect(screen.getByRole('searchbox')).toHaveValue('Standard')
  })

  it('calls onChange when the user types', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'D2s' } })
    expect(onChange).toHaveBeenCalledWith('D2s')
  })

  it('shows clear button only when value is non-empty', () => {
    const { rerender } = render(<SearchInput value="" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()

    rerender(<SearchInput value="D2s" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
  })

  it('calls onChange with empty string when clear button is clicked', () => {
    const onChange = vi.fn()
    render(<SearchInput value="D2s" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
