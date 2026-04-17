import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/toaster'

interface PortalLayoutProps {
  children: ReactNode
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <Toaster>
      <AppShell>
        {children}
      </AppShell>
    </Toaster>
  )
}
