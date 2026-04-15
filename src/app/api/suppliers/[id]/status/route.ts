import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

const updateStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

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

  if (user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
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

  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request.'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const existing = await prisma.supplier.findUnique({ where: { id } })
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Supplier not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: { status: parsed.data.status },
  })

  return new Response(JSON.stringify(supplier), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
