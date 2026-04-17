import { useMemo, useSyncExternalStore } from 'react'

import { APP_ROUTE_PATTERNS, matchRoute } from '@/lib/routing'

const NAVIGATION_EVENT = 'app:navigation'

function notifyNavigation() {
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange)
  window.addEventListener(NAVIGATION_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('popstate', onStoreChange)
    window.removeEventListener(NAVIGATION_EVENT, onStoreChange)
  }
}

function getSnapshot() {
  return window.location.href
}

function getServerSnapshot() {
  return '/'
}

function useCurrentHref() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function navigateTo(href: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, '', href)
  } else {
    window.history.pushState(null, '', href)
  }
  notifyNavigation()
}

export function useRouter() {
  return {
    push: (href: string) => navigateTo(href),
    replace: (href: string) => navigateTo(href, true),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => notifyNavigation(),
    prefetch: () => {},
  }
}

export function usePathname() {
  const href = useCurrentHref()
  return useMemo(() => new URL(href).pathname, [href])
}

export function useSearchParams() {
  const href = useCurrentHref()
  return useMemo(() => new URL(href).searchParams, [href])
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string>>() {
  const pathname = usePathname()

  for (const pattern of APP_ROUTE_PATTERNS) {
    const matched = matchRoute(pattern, pathname)
    if (matched) {
      return matched.params as T
    }
  }

  return {} as T
}
