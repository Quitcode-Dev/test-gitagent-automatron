'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useFieldArray, useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const createOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  items: z
    .array(
      z.object({
        description: z.string().min(1, 'Description is required'),
        quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
        unitPrice: z.coerce.number().positive('Unit price must be greater than 0'),
      }),
    )
    .min(1, 'At least one item is required'),
})

type CreateOrderFormValues = z.input<typeof createOrderSchema>
type CreateOrderSubmitValues = z.output<typeof createOrderSchema>

interface SupplierOption {
  id: string
  companyName: string
}

export default function CreateOrderPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderFormValues, undefined, CreateOrderSubmitValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      supplierId: '',
      items: [{ description: '', quantity: 1, unitPrice: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const supplierSessionError =
    session?.user?.role === 'SUPPLIER' && !session.user.supplierId
      ? 'Your account is missing supplier information.'
      : null

  const items = useWatch({ control, name: 'items' })
  const totalAmount = useMemo(
    () =>
      (items ?? []).reduce(
        (total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [items],
  )

  useEffect(() => {
    if (!session?.user) return

    if (session.user.role === 'SUPPLIER') {
      if (session.user.supplierId) {
        setValue('supplierId', session.user.supplierId)
      }
      return
    }

    if (session.user.role !== 'ADMIN') return

    fetch('/api/suppliers')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load suppliers (${res.status})`)
        return res.json()
      })
      .then((data: SupplierOption[]) => {
        setSuppliers(data)
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Failed to load suppliers.')
      })
  }, [session, setValue])

  async function onSubmit(values: CreateOrderSubmitValues) {
    setServerError(null)

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setServerError(data.error ?? 'Failed to create order.')
      return
    }

    const data = (await res.json()) as { id: string }
    router.push(`/orders/${data.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Order</CardTitle>
        <CardDescription>Add order details and one or more line items.</CardDescription>
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

          {session?.user?.role === 'ADMIN' && (
            <div className="space-y-1.5">
              <Label htmlFor="supplierId">Supplier</Label>
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={suppliers.length === 0}>
                    <SelectTrigger id="supplierId" aria-invalid={!!errors.supplierId}>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplierId && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.supplierId.message}
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Order items</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 1 })}
              >
                Add Item
              </Button>
            </div>

            {errors.items?.root?.message && (
              <p role="alert" className="text-sm text-destructive">
                {errors.items.root.message}
              </p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor={`items.${index}.description`}>Description</Label>
                    <Input
                      id={`items.${index}.description`}
                      type="text"
                      aria-invalid={!!errors.items?.[index]?.description}
                      {...register(`items.${index}.description`)}
                    />
                    {errors.items?.[index]?.description && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`items.${index}.quantity`}>Quantity</Label>
                    <Input
                      id={`items.${index}.quantity`}
                      type="number"
                      step="1"
                      min="1"
                      aria-invalid={!!errors.items?.[index]?.quantity}
                      {...register(`items.${index}.quantity`)}
                    />
                    {errors.items?.[index]?.quantity && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`items.${index}.unitPrice`}>Unit price</Label>
                    <Input
                      id={`items.${index}.unitPrice`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      aria-invalid={!!errors.items?.[index]?.unitPrice}
                      {...register(`items.${index}.unitPrice`)}
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p role="alert" className="text-sm text-destructive">
                        {errors.items[index]?.unitPrice?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total amount</p>
            <p className="text-lg font-semibold">${totalAmount.toFixed(2)}</p>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Order'}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
