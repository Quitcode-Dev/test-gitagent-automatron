import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SessionProvider } from 'next-auth/react'
import './index.css'
import App from './App.tsx'
import AuthLayout from './app/(auth)/layout.tsx'
import LoginPage from './app/(auth)/login/page.tsx'
import RegisterPage from './app/(auth)/register/page.tsx'
import PortalLayout from './app/(portal)/layout.tsx'
import DashboardPage from './app/(portal)/dashboard/page.tsx'
import OrdersPage from './app/(portal)/orders/page.tsx'
import CreateOrderPage from './app/(portal)/orders/new/page.tsx'
import OrderDetailPage from './app/(portal)/orders/[id]/page.tsx'
import InvoicesPage from './app/(portal)/invoices/page.tsx'
import CreateInvoicePage from './app/(portal)/invoices/new/page.tsx'
import InvoiceDetailPage from './app/(portal)/invoices/[id]/page.tsx'
import SuppliersPage from './app/(portal)/suppliers/page.tsx'
import SupplierDetailPage from './app/(portal)/suppliers/[id]/page.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route
            path="/login"
            element={
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            }
          />
          <Route element={<PortalLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<CreateOrderPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<CreateInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
)
