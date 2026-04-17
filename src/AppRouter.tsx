import { usePathname } from 'next/navigation'

import App from './App.tsx'
import AuthLayout from './app/(auth)/layout.tsx'
import LoginPage from './app/(auth)/login/page.tsx'
import RegisterPage from './app/(auth)/register/page.tsx'
import PortalLayout from './app/(portal)/layout.tsx'
import DashboardPage from './app/(portal)/dashboard/page.tsx'
import OrderDetailPage from './app/(portal)/orders/[id]/page.tsx'
import OrdersPage from './app/(portal)/orders/page.tsx'
import CreateOrderPage from './app/(portal)/orders/new/page.tsx'
import InvoiceDetailPage from './app/(portal)/invoices/[id]/page.tsx'
import InvoicesPage from './app/(portal)/invoices/page.tsx'
import CreateInvoicePage from './app/(portal)/invoices/new/page.tsx'
import SupplierDetailPage from './app/(portal)/suppliers/[id]/page.tsx'
import SuppliersPage from './app/(portal)/suppliers/page.tsx'
import { matchRoute } from './lib/routing'

const routes = [
  { path: '/', element: <App /> },
  { path: '/login', element: <LoginPage />, layout: 'auth' as const },
  { path: '/register', element: <RegisterPage />, layout: 'auth' as const },
  { path: '/dashboard', element: <DashboardPage />, layout: 'portal' as const },
  { path: '/orders', element: <OrdersPage />, layout: 'portal' as const },
  { path: '/orders/new', element: <CreateOrderPage />, layout: 'portal' as const },
  { path: '/orders/:id', element: <OrderDetailPage />, layout: 'portal' as const },
  { path: '/invoices', element: <InvoicesPage />, layout: 'portal' as const },
  { path: '/invoices/new', element: <CreateInvoicePage />, layout: 'portal' as const },
  { path: '/invoices/:id', element: <InvoiceDetailPage />, layout: 'portal' as const },
  { path: '/suppliers', element: <SuppliersPage />, layout: 'portal' as const },
  { path: '/suppliers/:id', element: <SupplierDetailPage />, layout: 'portal' as const },
]

export default function AppRouter() {
  const pathname = usePathname()
  let route: (typeof routes)[number] | undefined
  let dynamicRoute: (typeof routes)[number] | undefined

  for (const candidate of routes) {
    if (!candidate.path.includes(':')) {
      if (candidate.path === pathname) {
        route = candidate
        break
      }
      continue
    }

    if (!dynamicRoute && matchRoute(candidate.path, pathname)) {
      dynamicRoute = candidate
    }
  }

  route = route ?? dynamicRoute

  if (!route) {
    return <App />
  }

  if (route.layout === 'auth') {
    return <AuthLayout>{route.element}</AuthLayout>
  }

  if (route.layout === 'portal') {
    return <PortalLayout>{route.element}</PortalLayout>
  }

  return route.element
}
