import { useState, useEffect } from 'react'

export type Route = { view: 'home' } | { view: 'sku'; family: string }

export function parseRoute(hash: string): Route {
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  const m = path.match(/^\/sku\/([^/]+)\/?$/)
  if (m) return { view: 'sku', family: decodeURIComponent(m[1]) }
  return { view: 'home' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))

  useEffect(() => {
    function onHashChange() {
      setRoute(parseRoute(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}
