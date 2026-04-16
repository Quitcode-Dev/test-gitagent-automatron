import { OrderStatus, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

const createOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  items: z
    .array(
      z.object({
        description: z.string().min(1, 'Item description is required'),
        quantity: z.number().int().positive('Quantity must be greater than 0'),
        unitPrice: z.number().positive('Unit price must be greater than 0'),
      }),
    )
    .min(1, 'At least one order item is required'),
})

const MAX_ORDER_NUMBER_GENERATION_ATTEMPTS = 5

function generateOrderNumber(): string {
  return `ORD-${randomUUID().split('-')[0]!.toUpperCase()}`
}

function isOrderNumberConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('orderNumber')
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

  const validStatuses = Object.values(OrderStatus)
  if (statusParam && !validStatuses.includes(statusParam as OrderStatus)) {
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

  const where = {
    ...(statusParam ? { status: statusParam as OrderStatus } : {}),
    ...(user.role === 'SUPPLIER' ? { supplierId: user.supplierId as string } : {}),
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      supplier: {
        select: {
          id: true,
          companyName: true,
        },
      },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return new Response(JSON.stringify(orders), {
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

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request.'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { supplierId, items } = parsed.data

  if (user.role === 'SUPPLIER' && user.supplierId !== supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    return new Response(JSON.stringify({ error: 'Supplier not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const totalAmount = items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  )

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const order = await prisma.$transaction(async (tx) =>
        tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            supplierId,
            status: OrderStatus.DRAFT,
            totalAmount,
            items: {
              create: items,
            },
          },
          include: {
            items: true,
            supplier: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        }),
      )

      return new Response(JSON.stringify(order), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      if (!isOrderNumberConflict(error)) {
        return new Response(JSON.stringify({ error: 'Failed to create order.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (attempt === MAX_ORDER_NUMBER_GENERATION_ATTEMPTS - 1) {
        break
      }
    }
  }

  return new Response(
    JSON.stringify({
      error: 'Unable to generate unique order number after multiple attempts.',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
