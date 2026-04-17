'use client'

import { useMemo, useState } from 'react'
import type { OrderStatus, Role } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import { useToast } from '@/lib/use-toast'

interface OrderStatusActionsProps {
  orderId: string
  status: OrderStatus
  role?: Role
  onStatusUpdated?: () => void
}

interface StatusAction {
  status: OrderStatus
  label: string
  variant?: 'default' | 'outline' | 'destructive'
}

export function OrderStatusActions({ orderId, status, role, onStatusUpdated }: OrderStatusActionsProps) {
  const { toast } = useToast()
  const [submittingStatus, setSubmittingStatus] = useState<OrderStatus | null>(null)

  const actions = useMemo<StatusAction[]>(() => {
    if (!role || status === 'CANCELLED') return []

    if (role === 'ADMIN') {
      const nextActions: StatusAction[] = []

      if (status === 'DRAFT') {
        nextActions.push({ status: 'CONFIRMED', label: 'Confirm Order' })
      }

      if (status === 'SHIPPED') {
        nextActions.push({ status: 'DELIVERED', label: 'Mark Delivered' })
      }

      if ((['DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const).includes(status)) {
        nextActions.push({ status: 'CANCELLED', label: 'Cancel Order', variant: 'destructive' })
      }

      return nextActions
    }

    if (role === 'SUPPLIER' && status === 'CONFIRMED') {
      return [{ status: 'SHIPPED', label: 'Mark Shipped' }]
    }

    return []
  }, [role, status])

  async function updateStatus(nextStatus: OrderStatus) {
    setSubmittingStatus(nextStatus)

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast({
          title: 'Status update failed',
          description: data.error ?? 'Unable to update order status.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Order updated',
        description: `Order status changed to ${ORDER_STATUS_LABELS[nextStatus]}.`,
      })
      onStatusUpdated?.()
    } catch {
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
          onClick={() => updateStatus(action.status)}
          disabled={submittingStatus !== null}
        >
          {submittingStatus === action.status ? 'Updating…' : action.label}
        </Button>
      ))}
    </div>
  )
}
