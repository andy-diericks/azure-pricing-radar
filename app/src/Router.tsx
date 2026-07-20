import { lazy, Suspense, useState, useEffect } from 'react'
import App from './App'
import { parseRoute } from './lib/useRoute'

const SkuPage = lazy(() =>
  import('./components/SkuPage').then(m => ({ default: m.SkuPage })),
)

export function Router() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))

  useEffect(() => {
    function onHashChange() {
      setRoute(parseRoute(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route.view === 'sku') {
    return (
      <Suspense fallback={<div className="phc__lazy-fallback" aria-label="Loading" />}>
        <SkuPage family={route.family} />
      </Suspense>
    )
  }
  return <App />
}
