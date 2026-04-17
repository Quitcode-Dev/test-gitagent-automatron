'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { OrderStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'

import { OrderTable } from '@/components/tables/OrderTable'
import { Button } from '@/components/ui/button'

interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number | string
  currency: string
  createdAt: string
  supplier?: {
    id: string
    companyName: string
  } | null
}

export default function OrdersPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load orders (${res.status})`)
        return res.json()
      })
      .then((data: OrderListItem[]) => setOrders(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.'),
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="mt-1 text-muted-foreground">Manage all orders here.</p>
        </div>
        <Button asChild>
          <Link href="/orders/new">New Order</Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading orders…</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <OrderTable orders={orders} showSupplierColumn={session?.user?.role === 'ADMIN'} />
      )}
    </div>
  )
}
