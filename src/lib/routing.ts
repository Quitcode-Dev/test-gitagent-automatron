export interface RouteMatch {
  params: Record<string, string>
}

export const APP_ROUTE_PATTERNS = [
  '/orders/:id',
  '/invoices/:id',
  '/suppliers/:id',
]

function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  return path.endsWith('/') ? path.slice(0, -1) : path
}

export function matchRoute(pattern: string, pathname: string): RouteMatch | null {
  const normalizedPattern = normalizePath(pattern)
  const normalizedPathname = normalizePath(pathname)

  if (normalizedPattern === '/' || normalizedPathname === '/') {
    return normalizedPattern === normalizedPathname ? { params: {} } : null
  }

  const patternParts = normalizedPattern.split('/').filter(Boolean)
  const pathnameParts = normalizedPathname.split('/').filter(Boolean)

  if (patternParts.length !== pathnameParts.length) return null

  const params: Record<string, string> = {}

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathnamePart = pathnameParts[i]

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathnamePart)
      continue
    }

    if (patternPart !== pathnamePart) return null
  }

  return { params }
}
