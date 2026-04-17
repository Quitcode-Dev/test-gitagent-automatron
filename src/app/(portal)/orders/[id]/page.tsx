'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { InvoiceStatus, OrderStatus } from '@prisma/client'
import type { ComponentProps } from 'react'
import { useSession } from 'next-auth/react'

import { OrderStatusActions } from '@/components/shared/OrderStatusActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number | string
  currency: string
  createdAt: string
  updatedAt: string
  supplier: {
    id: string
    companyName: string
  } | null
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number | string
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    status: InvoiceStatus
    totalAmount: number | string
    currency: string
  }>
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError(null)

    fetch(`/api/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load order (${res.status})`)
        return res.json()
      })
      .then((data: OrderDetail) => setOrder(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.'),
      )
      .finally(() => setLoading(false))
  }, [id, refreshKey])

  if (loading) {
    return <p className="text-muted-foreground">Loading order…</p>
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? 'Order not found.'}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/orders">Back to orders</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
            <Badge variant={ORDER_STATUS_COLORS[order.status] as BadgeVariant}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Supplier: {order.supplier?.companyName ?? 'Unknown supplier'}
          </p>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(Number(order.totalAmount), order.currency)}
          </p>
          <p className="text-sm text-muted-foreground">
            Created{' '}
            <time dateTime={new Date(order.createdAt).toISOString()}>
              {formatDate(new Date(order.createdAt))}
            </time>{' '}
            - Updated{' '}
            <time dateTime={new Date(order.updatedAt).toISOString()}>
              {formatDate(new Date(order.updatedAt))}
            </time>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/orders">Back to orders</Link>
          </Button>
          <OrderStatusActions
            orderId={order.id}
            status={order.status}
            role={session?.user?.role}
            onStatusUpdated={() => setRefreshKey((current) => current + 1)}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Order items</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.unitPrice), order.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.unitPrice) * item.quantity, order.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Linked invoices</h2>
        {order.invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No linked invoices.</p>
        ) : (
          <div className="space-y-2">
            {order.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                  <Badge variant={INVOICE_STATUS_COLORS[invoice.status] as BadgeVariant}>
                    {INVOICE_STATUS_LABELS[invoice.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
