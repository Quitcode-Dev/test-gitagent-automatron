'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SidebarNav } from './Sidebar'

export function Header() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>Hyra</SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <span className="text-lg font-semibold md:hidden">Hyra</span>
      </div>

      <div className="flex items-center gap-3">
        {session?.user && (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium">{session.user.name}</span>
            <span className="text-xs text-muted-foreground">{session.user.email}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sign out"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </header>
  )
}
