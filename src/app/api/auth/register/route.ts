import { z } from 'zod'
import { hash } from 'bcryptjs'
import { SupplierStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().min(1, 'Company name is required'),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request.'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { name, email, password, companyName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return new Response(
      JSON.stringify({ error: 'An account with this email already exists.' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const passwordHash = await hash(password, 10)

  try {
    await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          companyName,
          contactEmail: email,
          contactPhone: '',
          address: '',
          status: SupplierStatus.PENDING,
        },
      })

      await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.SUPPLIER,
          supplierId: supplier.id,
        },
      })
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Registration failed. Please try again later.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ message: 'Account created successfully.' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
