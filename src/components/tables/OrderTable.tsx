import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ComponentProps } from 'react'
import type { OrderStatus } from '@prisma/client'

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
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

interface OrderTableOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number | string
  currency: string
  createdAt: Date | string
  supplier?: {
    id: string
    companyName: string
  } | null
}

interface OrderTableProps {
  orders: OrderTableOrder[]
  showSupplierColumn?: boolean
}

const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

export function OrderTable({ orders, showSupplierColumn = false }: OrderTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')

  const filtered = orders
    .filter((order) => statusFilter === 'ALL' || order.status === statusFilter)
    .filter((order) => order.orderNumber.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as OrderStatus | 'ALL')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              {showSupplierColumn && <TableHead>Supplier</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showSupplierColumn ? 6 : 5}
                  className="text-center text-muted-foreground py-6"
                >
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const parsedAmount =
                  typeof order.totalAmount === 'number'
                    ? order.totalAmount
                    : Number(order.totalAmount)
                const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0

                const parsedDate =
                  order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)
                const createdAtLabel = Number.isNaN(parsedDate.getTime())
                  ? '—'
                  : formatDate(parsedDate)

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    {showSupplierColumn && (
                      <TableCell>{order.supplier?.companyName ?? '—'}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant={ORDER_STATUS_COLORS[order.status] as BadgeVariant}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(amount, order.currency)}</TableCell>
                    <TableCell>{createdAtLabel}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/orders/${order.id}`}>View</Link>
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
