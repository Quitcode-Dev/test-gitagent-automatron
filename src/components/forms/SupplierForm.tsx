'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Supplier } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/lib/use-toast'

const supplierSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactEmail: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  contactPhone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

interface SupplierFormProps {
  supplier: Supplier
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      companyName: supplier.companyName,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      address: supplier.address,
    },
  })

  async function onSubmit(values: SupplierFormValues) {
    const res = await fetch(`/api/suppliers/${supplier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      let errorMessage = 'Unable to update supplier. Please try again.'
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
        // JSON parsing failed; keep the default error message
      }
      toast({ title: 'Update failed', description: errorMessage, variant: 'destructive' })
      return
    }

    toast({ title: 'Profile updated', description: 'Supplier profile saved successfully.' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          type="text"
          placeholder="Acme Corp"
          aria-invalid={!!errors.companyName}
          {...register('companyName')}
        />
        {errors.companyName && (
          <p role="alert" className="text-sm text-destructive">{errors.companyName.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          type="email"
          placeholder="contact@example.com"
          aria-invalid={!!errors.contactEmail}
          {...register('contactEmail')}
        />
        {errors.contactEmail && (
          <p role="alert" className="text-sm text-destructive">{errors.contactEmail.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input
          id="contactPhone"
          type="tel"
          placeholder="+1 555 000 0000"
          aria-invalid={!!errors.contactPhone}
          {...register('contactPhone')}
        />
        {errors.contactPhone && (
          <p role="alert" className="text-sm text-destructive">{errors.contactPhone.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          placeholder="123 Main St, Springfield, IL 62701"
          aria-invalid={!!errors.address}
          {...register('address')}
        />
        {errors.address && (
          <p role="alert" className="text-sm text-destructive">{errors.address.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
