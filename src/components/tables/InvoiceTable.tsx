'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ComponentProps } from 'react'
import type { InvoiceStatus } from '@prisma/client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

interface InvoiceTableInvoice {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  totalAmount: number | string
  currency: string
  dueDate: Date | string
  order: {
    id: string
    orderNumber: string
  }
  supplier?: {
    id: string
    companyName: string
  } | null
}

interface InvoiceTableProps {
  invoices: InvoiceTableInvoice[]
  showSupplierColumn?: boolean
}

const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]

export function InvoiceTable({ invoices, showSupplierColumn = false }: InvoiceTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')

  const filtered = invoices
    .filter((invoice) => statusFilter === 'ALL' || invoice.status === statusFilter)
    .filter((invoice) => invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by invoice number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'ALL')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {INVOICE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {INVOICE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Order Number</TableHead>
              {showSupplierColumn && <TableHead>Supplier</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showSupplierColumn ? 7 : 6}
                  className="text-center text-muted-foreground py-6"
                >
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((invoice) => {
                const parsedAmount =
                  typeof invoice.totalAmount === 'number'
                    ? invoice.totalAmount
                    : Number(invoice.totalAmount)
                const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0

                const parsedDate =
                  invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)
                const dueDateLabel = Number.isNaN(parsedDate.getTime()) ? '—' : formatDate(parsedDate)

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${invoice.order.id}`} className="hover:underline">
                        {invoice.order.orderNumber}
                      </Link>
                    </TableCell>
                    {showSupplierColumn && (
                      <TableCell>{invoice.supplier?.companyName ?? '—'}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant={INVOICE_STATUS_COLORS[invoice.status] as BadgeVariant}>
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(amount, invoice.currency)}</TableCell>
                    <TableCell>{dueDateLabel}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/invoices/${invoice.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
