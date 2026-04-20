'use client'

import type { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import '../index.css'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return <SessionProvider>{children}</SessionProvider>
}
