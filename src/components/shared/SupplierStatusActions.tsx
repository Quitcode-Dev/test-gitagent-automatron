import { useState } from 'react'
import type { Supplier } from '@prisma/client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/use-toast'

interface SupplierStatusActionsProps {
  supplier: Supplier
  onStatusChange: (updated: Supplier) => void
}

export function SupplierStatusActions({ supplier, onStatusChange }: SupplierStatusActionsProps) {
  const { toast } = useToast()
  const [pendingAction, setPendingAction] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (supplier.status !== 'PENDING') return null

  async function handleConfirm() {
    if (!pendingAction) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingAction }),
      })

      if (!res.ok) {
        let errorMessage = 'Unable to update supplier status. Please try again.'
        try {
          const data: unknown = await res.json()
          if (
            data !== null &&
            typeof data === 'object' &&
            'error' in data &&
            typeof (data as Record<string, unknown>).error === 'string'
          ) {
            errorMessage = (data as { error: string }).error
          }
        } catch {
          // JSON parsing failed; keep default message
        }
        toast({ title: 'Action failed', description: errorMessage, variant: 'destructive' })
      } else {
        const updated = (await res.json()) as Supplier
        onStatusChange(updated)
        toast({
          title: pendingAction === 'APPROVED' ? 'Supplier approved' : 'Supplier rejected',
          description:
            pendingAction === 'APPROVED'
              ? 'The supplier has been approved successfully.'
              : 'The supplier has been rejected.',
        })
      }
    } catch {
      toast({
        title: 'Action failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
      setPendingAction(null)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setPendingAction('APPROVED')}
        >
          Approve
        </Button>
        <Button variant="destructive" onClick={() => setPendingAction('REJECTED')}>
          Reject
        </Button>
      </div>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={open => {
          if (!open) setPendingAction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'APPROVED' ? 'Approve supplier?' : 'Reject supplier?'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'APPROVED'
                ? 'Are you sure you want to approve this supplier? They will gain access to the portal.'
                : 'Are you sure you want to reject this supplier? They will not be granted portal access.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingAction(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant={pendingAction === 'APPROVED' ? 'default' : 'destructive'}
              className={
                pendingAction === 'APPROVED' ? 'bg-green-600 hover:bg-green-700 text-white' : ''
              }
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting
                ? 'Processing…'
                : pendingAction === 'APPROVED'
                  ? 'Approve'
                  : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
