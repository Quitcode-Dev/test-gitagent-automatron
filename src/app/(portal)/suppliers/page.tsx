import { useEffect, useState } from 'react'
import type { Supplier } from '@prisma/client'

import { SupplierTable } from '@/components/tables/SupplierTable'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/suppliers')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load suppliers (${res.status})`)
        return res.json()
      })
      .then((data: Supplier[]) => setSuppliers(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'An unexpected error occurred.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <p className="mt-1 text-muted-foreground">Manage all suppliers here.</p>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading suppliers…</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <SupplierTable suppliers={suppliers} />
      )}
    </div>
  )
}

