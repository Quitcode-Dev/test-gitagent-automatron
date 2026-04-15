import { Outlet } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/toaster'

export default function PortalLayout() {
  return (
    <Toaster>
      <AppShell>
        <Outlet />
      </AppShell>
    </Toaster>
  )
}
