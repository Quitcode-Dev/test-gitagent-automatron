'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Supplier } from '@prisma/client'
import type { ComponentProps } from 'react'

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
import { SUPPLIER_STATUS_COLORS, SUPPLIER_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import type { SupplierStatus } from '@/types'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

interface SupplierTableProps {
  suppliers: Supplier[]
}

export function SupplierTable({ suppliers }: SupplierTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'ALL'>('ALL')

  const filtered = suppliers
    .filter(s => statusFilter === 'ALL' || s.status === statusFilter)
    .filter(s => s.companyName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by company name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={val => setStatusFilter(val as SupplierStatus | 'ALL')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No suppliers found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(supplier => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.companyName}</TableCell>
                  <TableCell>{supplier.contactEmail}</TableCell>
                  <TableCell>
                    <Badge variant={SUPPLIER_STATUS_COLORS[supplier.status] as BadgeVariant}>
                      {SUPPLIER_STATUS_LABELS[supplier.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(supplier.createdAt)}</TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/suppliers/${supplier.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
