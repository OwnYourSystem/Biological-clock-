import { useEffect, useState } from 'react'
import type { Route } from './shell'

const ROUTES: Route[] = ['today', 'episode', 'week', 'lag', 'more', 'labs', 'meds', 'export', 'report', 'settings']

function readHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(raw) ? (raw as Route) : 'today'
}

/**
 * Hash routing, so the Android home screen shortcut can point straight at
 * '#/episode' and land on the episode screen with the app cold.
 */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(readHash)

  useEffect(() => {
    const onChange = () => setRoute(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = (next: Route) => {
    window.location.hash = `#/${next}`
    setRoute(next)
    window.scrollTo({ top: 0 })
  }

  return [route, navigate]
}
