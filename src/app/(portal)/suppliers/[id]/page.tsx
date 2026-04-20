'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { Supplier } from '@prisma/client'
import type { ComponentProps } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SupplierForm } from '@/components/forms/SupplierForm'
import { DocumentManager } from '@/components/shared/DocumentManager'
import { SupplierStatusActions } from '@/components/shared/SupplierStatusActions'
import { SUPPLIER_STATUS_COLORS, SUPPLIER_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/suppliers/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load supplier (${res.status})`)
        return res.json()
      })
      .then((data: Supplier) => setSupplier(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.'),
      )
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <p className="text-muted-foreground">Loading supplier…</p>
  }

  if (error || !supplier) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? 'Supplier not found.'}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/suppliers">Back to suppliers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{supplier.companyName}</h1>
            <Badge variant={SUPPLIER_STATUS_COLORS[supplier.status] as BadgeVariant}>
              {SUPPLIER_STATUS_LABELS[supplier.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(new Date(supplier.createdAt))} · Updated{' '}
            {formatDate(new Date(supplier.updatedAt))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/suppliers">Back to suppliers</Link>
          </Button>
          {session?.user?.role === 'ADMIN' && (
            <SupplierStatusActions supplier={supplier} onStatusChange={setSupplier} />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Update the supplier's contact information and address.</CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierForm supplier={supplier} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Upload and manage compliance documents and certificates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentManager supplierId={supplier.id} />
        </CardContent>
      </Card>
    </div>
  )
}
