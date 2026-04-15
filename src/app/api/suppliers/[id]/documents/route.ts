import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { DocumentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function sanitizeFileName(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
}

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

  if (user.role !== 'ADMIN' && user.supplierId !== id) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supplier = await prisma.supplier.findUnique({ where: { id } })
  if (!supplier) {
    return new Response(JSON.stringify({ error: 'Supplier not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const documents = await prisma.document.findMany({
    where: { supplierId: id },
    orderBy: { uploadedAt: 'desc' },
  })

  return new Response(JSON.stringify(documents), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(
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

  if (user.role !== 'ADMIN' && user.supplierId !== id) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supplier = await prisma.supplier.findUnique({ where: { id } })
  if (!supplier) {
    return new Response(JSON.stringify({ error: 'Supplier not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const file = formData.get('file')
  const documentType = formData.get('documentType')

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'File is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (file.size > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: 'File size exceeds the 10 MB limit.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const validDocumentTypes = Object.values(DocumentType)
  if (
    !documentType ||
    typeof documentType !== 'string' ||
    !validDocumentTypes.includes(documentType as DocumentType)
  ) {
    return new Response(
      JSON.stringify({
        error: `documentType must be one of: ${validDocumentTypes.join(', ')}.`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadsDir, { recursive: true })

  const safeName = sanitizeFileName(file.name)
  const uniqueFileName = `${crypto.randomUUID()}-${safeName}`
  const filePath = path.join(uploadsDir, uniqueFileName)
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, fileBuffer)

  const fileUrl = `/uploads/${uniqueFileName}`

  let document
  try {
    document = await prisma.document.create({
      data: {
        supplierId: id,
        fileName: file.name,
        fileUrl,
        documentType: documentType as DocumentType,
      },
    })
  } catch (err) {
    await fs.unlink(filePath).catch(() => {})
    throw err
  }

  return new Response(JSON.stringify(document), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
