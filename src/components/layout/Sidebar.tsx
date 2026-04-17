import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/navigation'

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const supplierId = session?.user?.supplierId

  const visibleItems = navItems
    .filter(item => !role || item.roles.includes(role))
    .filter(item => !item.href.includes('[myId]') || !!supplierId)
    .map(item => ({
      ...item,
      href: supplierId ? item.href.replace('[myId]', supplierId) : item.href,
    }))

  return (
    <nav className="flex flex-col gap-1 p-4">
      {visibleItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate}>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-2',
              (pathname === href || pathname.startsWith(`${href}/`)) &&
                'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        </Link>
      ))}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-semibold">Hyra</span>
      </div>
      <div className="flex-1 overflow-auto">
        <SidebarNav />
      </div>
    </aside>
  )
}
