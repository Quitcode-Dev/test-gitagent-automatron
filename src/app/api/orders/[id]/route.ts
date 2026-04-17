import { OrderStatus, Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

const adminUpdatableStatusesByCurrent: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [OrderStatus.CANCELLED],
  CANCELLED: [],
}

const supplierUpdatableStatusesByCurrent: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: [],
  CONFIRMED: [OrderStatus.SHIPPED],
  SHIPPED: [],
  DELIVERED: [],
  CANCELLED: [],
}

function getUpdatableStatusesByCurrent(role: Role): Record<OrderStatus, OrderStatus[]> {
  return role === 'ADMIN' ? adminUpdatableStatusesByCurrent : supplierUpdatableStatusesByCurrent
}

const updateOrderSchema = z
  .object({
    status: z.nativeEnum(OrderStatus).optional(),
    items: z
      .array(
        z.object({
          description: z.string().min(1, 'Item description is required'),
          quantity: z.number().int().positive('Quantity must be greater than 0'),
          unitPrice: z.number().positive('Unit price must be greater than 0'),
        }),
      )
      .min(1, 'At least one order item is required')
      .optional(),
  })
  .refine((data) => data.status !== undefined || data.items !== undefined, {
    message: 'Provide at least one field to update.',
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

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      supplier: true,
      invoices: true,
    },
  })

  if (!order) {
    return new Response(JSON.stringify({ error: 'Order not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (user.role !== 'ADMIN' && user.supplierId !== order.supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(order), {
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

  const parsed = updateOrderSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request.'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!existingOrder) {
    return new Response(JSON.stringify({ error: 'Order not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (user.role !== 'ADMIN' && user.supplierId !== existingOrder.supplierId) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { status, items } = parsed.data

  if (status && status !== existingOrder.status) {
    const allowedTransitions = getUpdatableStatusesByCurrent(user.role)[existingOrder.status]
    if (!allowedTransitions.includes(status)) {
      return new Response(JSON.stringify({ error: 'Forbidden status transition.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  if (items && existingOrder.status !== OrderStatus.DRAFT) {
    return new Response(JSON.stringify({ error: 'Order items can only be updated while status is draft.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.orderItem.deleteMany({ where: { orderId: existingOrder.id } })
        await tx.orderItem.createMany({
          data: items.map((item) => ({
            orderId: existingOrder.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        })
      }

      return tx.order.update({
        where: { id: existingOrder.id },
        data: {
          ...(status ? { status } : {}),
          ...(items
            ? {
                totalAmount: items.reduce(
                  (total, item) => total + item.quantity * item.unitPrice,
                  0,
                ),
              }
            : {}),
        },
        include: {
          items: true,
          supplier: true,
          invoices: true,
        },
      })
    })

    return new Response(JSON.stringify(updatedOrder), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to update order.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
