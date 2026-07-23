import { describe, it, expect } from 'vitest'
import { parseRoute } from './useRoute'

describe('parseRoute', () => {
  it('returns home for empty hash', () => {
    expect(parseRoute('')).toEqual({ view: 'home' })
  })

  it('returns home for bare hash', () => {
    expect(parseRoute('#')).toEqual({ view: 'home' })
  })

  it('returns home for unrecognised path', () => {
    expect(parseRoute('#/other/page')).toEqual({ view: 'home' })
  })

  it('returns sku view for /sku/<family>', () => {
    expect(parseRoute('#/sku/Standard_D2s_v5')).toEqual({
      view: 'sku',
      family: 'Standard_D2s_v5',
    })
  })

  it('returns sku view for /sku/<family>/ with trailing slash', () => {
    expect(parseRoute('#/sku/Standard_D4s_v5/')).toEqual({
      view: 'sku',
      family: 'Standard_D4s_v5',
    })
  })

  it('decodes percent-encoded family name', () => {
    expect(parseRoute('#/sku/Standard%20D2s')).toEqual({
      view: 'sku',
      family: 'Standard D2s',
    })
  })

  it('returns home for nested sku path (no sub-routes)', () => {
    expect(parseRoute('#/sku/Foo/Bar')).toEqual({ view: 'home' })
  })

  it('works without leading # when given a plain path', () => {
    expect(parseRoute('/sku/Standard_D2s_v5')).toEqual({
      view: 'sku',
      family: 'Standard_D2s_v5',
    })
  })

  it('returns digests view for #/digests', () => {
    expect(parseRoute('#/digests')).toEqual({ view: 'digests' })
  })

  it('returns digests view for #/digests/ with trailing slash', () => {
    expect(parseRoute('#/digests/')).toEqual({ view: 'digests' })
  })

  it('returns digests view for plain /digests path', () => {
    expect(parseRoute('/digests')).toEqual({ view: 'digests' })
  })
})
