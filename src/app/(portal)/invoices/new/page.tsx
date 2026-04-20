'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { OrderStatus } from '@prisma/client'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'

const createInvoiceSchema = z.object({
  orderId: z.string().min(1, 'Order is required'),
  totalAmount: z.coerce.number().positive('Total amount must be greater than 0'),
  currency: z.string().trim().min(1, 'Currency is required'),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .pipe(z.coerce.date())
    .refine((value) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return value > today
    }, 'Due date must be in the future'),
})

type CreateInvoiceFormValues = z.input<typeof createInvoiceSchema>
type CreateInvoiceSubmitValues = z.output<typeof createInvoiceSchema>

interface OrderOption {
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

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP']
const ORDER_STATUSES: OrderStatus[] = ['CONFIRMED', 'DELIVERED']
export const dynamic = 'force-dynamic'

function CreateInvoicePageContent() {
  const router = useRouter()
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<OrderOption[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const preselectedOrderId = searchParams.get('orderId') ?? ''

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceFormValues, undefined, CreateInvoiceSubmitValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      orderId: '',
      currency: 'USD',
      dueDate: '',
    },
  })

  const selectedOrderId = useWatch({ control, name: 'orderId' })
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  )

  const supplierSessionError =
    session?.user?.role === 'SUPPLIER' && !session.user.supplierId
      ? 'Your account is missing supplier information.'
      : null

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    Promise.all(
      ORDER_STATUSES.map(async (status) => {
        const response = await fetch(`/api/orders?status=${status}`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to load orders (${response.status})`)
        }

        return (await response.json()) as OrderOption[]
      }),
    )
      .then((responses) => {
        if (!isActive) return
        setOrders(responses.flat())
        setLoadingOrders(false)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadError(error instanceof Error ? error.message : 'Failed to load orders.')
        setLoadingOrders(false)
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!preselectedOrderId || orders.length === 0) return

    const matchingOrder = orders.find((order) => order.id === preselectedOrderId)
    if (matchingOrder) {
      setValue('orderId', matchingOrder.id)
    }
  }, [orders, preselectedOrderId, setValue])

  async function onSubmit(values: CreateInvoiceSubmitValues) {
    setServerError(null)

    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      setServerError(data.error ?? 'Failed to create invoice.')
      return
    }

    const data = (await response.json()) as { id: string }
    router.push(`/invoices/${data.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Invoice</CardTitle>
        <CardDescription>Create a new invoice linked to an existing order.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-6">
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}

          {loadError && (
            <p role="alert" className="text-sm text-destructive">
              {loadError}
            </p>
          )}

          {supplierSessionError && (
            <p role="alert" className="text-sm text-destructive">
              {supplierSessionError}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="orderId">Order</Label>
            <Controller
              name="orderId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={orders.length === 0}>
                  <SelectTrigger id="orderId" aria-invalid={!!errors.orderId}>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber} - {formatCurrency(Number(order.totalAmount), order.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.orderId && (
              <p role="alert" className="text-sm text-destructive">
                {errors.orderId.message}
              </p>
            )}
            {loadingOrders && (
              <p className="text-sm text-muted-foreground">Loading available orders…</p>
            )}
            {!loadingOrders && orders.length === 0 && !loadError && (
              <p className="text-sm text-muted-foreground">
                No confirmed or delivered orders are available to invoice.
              </p>
            )}
          </div>

          {selectedOrder && (
            <div className="rounded-md border p-4 space-y-3">
              <p className="text-sm font-medium">Order details</p>
              <p className="text-sm text-muted-foreground">
                {selectedOrder.orderNumber} -{' '}
                {formatCurrency(Number(selectedOrder.totalAmount), selectedOrder.currency)}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {selectedOrder.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.description} (
                    {formatCurrency(Number(item.unitPrice), selectedOrder.currency)} each)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="totalAmount">Total amount</Label>
              <Input
                id="totalAmount"
                type="number"
                min="0.01"
                step="0.01"
                aria-invalid={!!errors.totalAmount}
                {...register('totalAmount')}
              />
              {errors.totalAmount && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.totalAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="currency" aria-invalid={!!errors.currency}>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.currency.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" aria-invalid={!!errors.dueDate} {...register('dueDate')} />
              {errors.dueDate && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !!supplierSessionError}>
            {isSubmitting ? 'Submitting…' : 'Submit Invoice'}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={null}>
      <CreateInvoicePageContent />
    </Suspense>
  )
}
