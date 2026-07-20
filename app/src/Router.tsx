import { useState, useEffect } from 'react'
import App from './App'
import { SkuPage } from './components/SkuPage'
import { parseRoute } from './lib/useRoute'

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
    return <SkuPage family={route.family} />
  }
  return <App />
}
