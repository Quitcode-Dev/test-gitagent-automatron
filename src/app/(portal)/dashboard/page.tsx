'use client'

import { useSession } from 'next-auth/react'
import {
  Building2,
  FileText,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
} from 'lucide-react'

import { StatCard } from '@/components/shared/StatCard'

export default function DashboardPage() {
  const { data: session } = useSession()
  const user = session?.user
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          {user?.name ? `Welcome back, ${user.name}!` : 'Welcome to the Hyra Supplier Portal.'}
        </p>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Suppliers" value={0} icon={Building2} />
          <StatCard label="Pending Approvals" value={0} icon={Clock} />
          <StatCard label="Total Orders" value={0} icon={ShoppingCart} />
          <StatCard label="Total Invoices" value={0} icon={FileText} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Orders" value={0} icon={Clock} />
          <StatCard label="Confirmed Orders" value={0} icon={CheckCircle} />
          <StatCard label="Cancelled Orders" value={0} icon={XCircle} />
          <StatCard label="Total Invoice Amount" value="$0.00" icon={Banknote} />
        </div>
      )}
    </div>
  )
}
