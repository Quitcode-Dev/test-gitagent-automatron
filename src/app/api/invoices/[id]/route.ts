import { InvoiceStatus, Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

const adminUpdatableStatusesByCurrent: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: [],
  SUBMITTED: [InvoiceStatus.APPROVED, InvoiceStatus.REJECTED],
  APPROVED: [InvoiceStatus.PAID],
  PAID: [],
  REJECTED: [],
}

const supplierUpdatableStatusesByCurrent: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: [InvoiceStatus.SUBMITTED],
  SUBMITTED: [],
  APPROVED: [],
  PAID: [],
  REJECTED: [],
}

function getUpdatableStatusesByCurrent(role: Role): Record<InvoiceStatus, InvoiceStatus[]> {
  return role === 'ADMIN' ? adminUpdatableStatusesByCurrent : supplierUpdatableStatusesByCurrent
}

const updateInvoiceSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
})

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const user = await getCurrentUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: true,
        },
      },
      supplier: true,
    },
  })

  if (!invoice) {
    return new Response(JSON.stringify({ error: 'Invoice not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (user.role !== 'ADMIN' && user.supplierId !== invoice.supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(invoice), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const user = await getCurrentUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = updateInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed: invalid status value.'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const existingInvoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: true,
        },
      },
      supplier: true,
    },
  })

  if (!existingInvoice) {
    return new Response(JSON.stringify({ error: 'Invoice not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (user.role !== 'ADMIN' && user.supplierId !== existingInvoice.supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { status } = parsed.data

  if (status !== existingInvoice.status) {
    const allowedTransitions = getUpdatableStatusesByCurrent(user.role)[existingInvoice.status]
    if (!allowedTransitions.includes(status)) {
      const allowedTransitionsLabel = allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none'
      return new Response(
        JSON.stringify({
          error: `Invalid status transition from ${existingInvoice.status} to ${status} for current role. Allowed transitions: ${allowedTransitionsLabel}.`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  try {
    const updatedInvoice = await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: {
        status,
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
        supplier: true,
      },
    })

    return new Response(JSON.stringify(updatedInvoice), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to update invoice.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
