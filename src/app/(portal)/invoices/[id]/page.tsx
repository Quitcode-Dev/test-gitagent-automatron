'use client'

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ComponentProps } from 'react'
import type { InvoiceStatus, OrderStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'

import { InvoiceStatusActions } from '@/components/shared/InvoiceStatusActions'
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

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  totalAmount: number | string
  currency: string
  dueDate: string
  createdAt: string
  supplier: {
    id: string
    companyName: string
  } | null
  order: {
    id: string
    orderNumber: string
    status: OrderStatus
    totalAmount: number | string
    currency: string
    items: Array<{
      id: string
      description: string
      quantity: number
      unitPrice: number | string
    }>
  }
}

const INVOICE_STATUS_TIMELINE: InvoiceStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED']

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()
    let isActive = true

    fetch(`/api/invoices/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load invoice (${res.status})`)
        return res.json()
      })
      .then((data: InvoiceDetail) => {
        if (!isActive) return
        setInvoice(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!isActive) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      })
      .finally(() => {
        if (!isActive) return
        setLoading(false)
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [id, refreshKey])

  if (!id) {
    return <p className="text-destructive">Invoice ID is required.</p>
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading invoice…</p>
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? 'Invoice not found.'}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/invoices">Back to invoices</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{invoice.invoiceNumber}</h1>
            <Badge variant={INVOICE_STATUS_COLORS[invoice.status] as BadgeVariant}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Supplier: {invoice.supplier?.companyName ?? 'Unknown supplier'}
          </p>
          <p className="text-sm text-muted-foreground">
            Amount: {formatCurrency(Number(invoice.totalAmount), invoice.currency)} ({invoice.currency})
          </p>
          <p className="text-sm text-muted-foreground">
            Due{' '}
            <time dateTime={new Date(invoice.dueDate).toISOString()}>
              {formatDate(new Date(invoice.dueDate))}
            </time>{' '}
            • Created{' '}
            <time dateTime={new Date(invoice.createdAt).toISOString()}>
              {formatDate(new Date(invoice.createdAt))}
            </time>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/invoices">Back to invoices</Link>
          </Button>
          <InvoiceStatusActions
            invoiceId={invoice.id}
            status={invoice.status}
            role={session?.user?.role}
            onStatusUpdated={() => setRefreshKey((current) => current + 1)}
          />
        </div>
      </div>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">Status timeline</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Current status:</span>
          <Badge variant={INVOICE_STATUS_COLORS[invoice.status] as BadgeVariant}>
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Badge>
        </div>
        <ol className="space-y-2 text-sm">
          {INVOICE_STATUS_TIMELINE.map((status) => (
            <li
              key={status}
              className={status === invoice.status ? 'font-medium text-foreground' : 'text-muted-foreground'}
            >
              {INVOICE_STATUS_LABELS[status]}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">Linked order</h2>
        <div className="space-y-1 text-sm">
          <p>
            Order:{' '}
            <Link to={`/orders/${invoice.order.id}`} className="font-medium hover:underline">
              {invoice.order.orderNumber}
            </Link>
          </p>
          <p>
            Status:{' '}
            <Badge variant={ORDER_STATUS_COLORS[invoice.order.status] as BadgeVariant}>
              {ORDER_STATUS_LABELS[invoice.order.status]}
            </Badge>
          </p>
          <p className="text-muted-foreground">
            Total: {formatCurrency(Number(invoice.order.totalAmount), invoice.order.currency)}
          </p>
        </div>
      </section>

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
              {invoice.order.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                invoice.order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.unitPrice), invoice.order.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.unitPrice) * item.quantity, invoice.order.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
