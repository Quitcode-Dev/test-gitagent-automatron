'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { InvoiceStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'

import { InvoiceTable } from '@/components/tables/InvoiceTable'
import { Button } from '@/components/ui/button'

interface InvoiceListItem {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  totalAmount: number | string
  currency: string
  dueDate: string
  order: {
    id: string
    orderNumber: string
  }
  supplier?: {
    id: string
    companyName: string
  } | null
}

export default function InvoicesPage() {
  const { data: session } = useSession()
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    fetch('/api/invoices', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load invoices (${res.status})`)
        return res.json()
      })
      .then((data: InvoiceListItem[]) => {
        if (!isActive) return
        setInvoices(data)
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
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="mt-1 text-muted-foreground">Manage your invoices here.</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">Submit Invoice</Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading invoices…</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <InvoiceTable
          invoices={invoices}
          showSupplierColumn={session?.user?.role === 'ADMIN'}
        />
      )}
    </div>
  )
}
