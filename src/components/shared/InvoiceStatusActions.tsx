'use client'

import { useMemo, useState } from 'react'
import type { InvoiceStatus, Role } from '@prisma/client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { INVOICE_STATUS_LABELS } from '@/lib/constants'
import { useToast } from '@/lib/use-toast'

interface InvoiceStatusActionsProps {
  invoiceId: string
  status: InvoiceStatus
  role?: Role
  onStatusUpdated?: () => void
}

interface StatusAction {
  status: InvoiceStatus
  label: string
  variant?: 'default' | 'outline' | 'destructive'
  className?: string
}

export function InvoiceStatusActions({
  invoiceId,
  status,
  role,
  onStatusUpdated,
}: InvoiceStatusActionsProps) {
  const { toast } = useToast()
  const [submittingStatus, setSubmittingStatus] = useState<InvoiceStatus | null>(null)
  const [pendingStatus, setPendingStatus] = useState<InvoiceStatus | null>(null)

  const actions = useMemo<StatusAction[]>(() => {
    if (!role) return []

    if (role === 'SUPPLIER' && status === 'DRAFT') {
      return [{ status: 'SUBMITTED', label: 'Submit Invoice' }]
    }

    if (role === 'ADMIN' && status === 'SUBMITTED') {
      return [
        {
          status: 'APPROVED',
          label: 'Approve',
          className: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
        },
        { status: 'REJECTED', label: 'Reject', variant: 'destructive' },
      ]
    }

    if (role === 'ADMIN' && status === 'APPROVED') {
      return [{ status: 'PAID', label: 'Mark as Paid' }]
    }

    return []
  }, [role, status])

  async function updateStatus(nextStatus: InvoiceStatus) {
    setSubmittingStatus(nextStatus)

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast({
          title: 'Status update failed',
          description: data.error ?? 'Unable to update invoice status.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Invoice updated',
        description: `Invoice status changed to ${INVOICE_STATUS_LABELS[nextStatus]}.`,
      })
      onStatusUpdated?.()
    } catch (error) {
      console.error('Failed to update invoice status:', error)
      toast({
        title: 'Status update failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingStatus(null)
    }
  }

  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <Button
          key={action.status}
          size="sm"
          variant={action.variant}
          className={action.className}
          onClick={() => setPendingStatus(action.status)}
          disabled={submittingStatus !== null}
        >
          {submittingStatus === action.status ? 'Updating…' : action.label}
        </Button>
      ))}
      <Dialog open={pendingStatus !== null} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm status change</DialogTitle>
            <DialogDescription>
              {pendingStatus
                ? `Are you sure you want to set this invoice to ${INVOICE_STATUS_LABELS[pendingStatus]}?`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)} disabled={submittingStatus !== null}>
              Cancel
            </Button>
            <Button
              variant={pendingStatus === 'REJECTED' ? 'destructive' : 'default'}
              onClick={() => {
                if (!pendingStatus) return
                const nextStatus = pendingStatus
                setPendingStatus(null)
                void updateStatus(nextStatus)
              }}
              disabled={!pendingStatus || submittingStatus !== null}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
