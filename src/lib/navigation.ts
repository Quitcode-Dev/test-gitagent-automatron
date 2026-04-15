import { LayoutDashboard, ShoppingCart, FileText, Building2, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@prisma/client'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: Role[]
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPPLIER', 'ADMIN'],
  },
  {
    label: 'My Profile',
    href: '/suppliers/[myId]',
    icon: User,
    roles: ['SUPPLIER'],
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: Building2,
    roles: ['ADMIN'],
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: ShoppingCart,
    roles: ['SUPPLIER', 'ADMIN'],
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: FileText,
    roles: ['SUPPLIER', 'ADMIN'],
  },
]
