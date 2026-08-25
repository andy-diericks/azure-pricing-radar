import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GlobalSkuSearch } from './GlobalSkuSearch'
import type { SkuFamily } from '../lib/loadSkuFamilies'

const FAMILIES: SkuFamily[] = [
  { family: 'Standard_D2s_v5', productName: 'Virtual Machines Dsv5 Series' },
  { family: 'Standard_D4s_v5', productName: 'Virtual Machines Dsv5 Series' },
]

function setup() {
  const onSelect = vi.fn()
  const loader = vi.fn().mockResolvedValue(FAMILIES)
  render(<GlobalSkuSearch loader={loader} onSelect={onSelect} />)
  const input = screen.getByRole('combobox')
  return { onSelect, loader, input }
}

describe('GlobalSkuSearch', () => {
  it('loads families lazily on focus (not before)', async () => {
    const { loader, input } = setup()
    expect(loader).not.toHaveBeenCalled()
    fireEvent.focus(input)
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1))
  })

  it('shows matching options as the user types', async () => {
    const { input } = setup()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'D2s' } })
    await waitFor(() => expect(screen.getByRole('option', { name: /Standard_D2s_v5/ })).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: /Standard_D4s_v5/ })).not.toBeInTheDocument()
  })

  it('navigates to the SKU on click', async () => {
    const { input, onSelect } = setup()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'D2s' } })
    const opt = await screen.findByRole('option', { name: /Standard_D2s_v5/ })
    fireEvent.mouseDown(opt)
    expect(onSelect).toHaveBeenCalledWith('Standard_D2s_v5')
  })

  it('supports arrow-down + Enter to select', async () => {
    const { input, onSelect } = setup()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Standard_D' } })
    await screen.findByRole('option', { name: /Standard_D2s_v5/ })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('Standard_D2s_v5')
  })

  it('shows a no-match message for an unknown SKU', async () => {
    const { input } = setup()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'zzz-nope' } })
    await waitFor(() => expect(screen.getByText(/No tracked SKU matches/)).toBeInTheDocument())
  })
})
