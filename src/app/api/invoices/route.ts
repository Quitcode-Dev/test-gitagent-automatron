import { InvoiceStatus, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

const createInvoiceSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
  currency: z.string().trim().min(1, 'Currency is required'),
  dueDate: z.coerce.date(),
})

const MAX_INVOICE_NUMBER_RETRIES = 5

function generateInvoiceNumber(): string {
  return `INV-${randomUUID().replace(/-/g, '').toUpperCase()}`
}

function isInvoiceNumberConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('invoiceNumber')
  )
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const orderIdParam = searchParams.get('orderId')

  const validStatuses = Object.values(InvoiceStatus)
  if (statusParam && !validStatuses.includes(statusParam as InvoiceStatus)) {
    return new Response(JSON.stringify({ error: 'Invalid status filter.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (user.role === 'SUPPLIER' && !user.supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const where: Prisma.InvoiceWhereInput = {
    ...(statusParam ? { status: statusParam as InvoiceStatus } : {}),
    ...(orderIdParam ? { orderId: orderIdParam } : {}),
    ...(user.role === 'SUPPLIER' ? { supplierId: user.supplierId as string } : {}),
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      order: true,
      supplier: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return new Response(JSON.stringify(invoices), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed: invalid invoice input data.'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (user.role === 'SUPPLIER' && !user.supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { orderId, totalAmount, currency, dueDate } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, supplierId: true },
  })

  if (!order) {
    return new Response(JSON.stringify({ error: 'Order not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (user.role === 'SUPPLIER' && user.supplierId !== order.supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  for (let attempt = 0; attempt < MAX_INVOICE_NUMBER_RETRIES; attempt += 1) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          orderId: order.id,
          supplierId: order.supplierId,
          status: InvoiceStatus.DRAFT,
          totalAmount,
          currency,
          dueDate,
        },
        include: {
          order: true,
          supplier: true,
        },
      })

      return new Response(JSON.stringify(invoice), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      if (!isInvoiceNumberConflict(error)) {
        return new Response(JSON.stringify({ error: 'Failed to create invoice.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (attempt === MAX_INVOICE_NUMBER_RETRIES - 1) {
        break
      }
    }
  }

  return new Response(
    JSON.stringify({
      error: 'Unable to generate unique invoice number after multiple attempts.',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
