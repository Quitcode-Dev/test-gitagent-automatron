import fs from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; docId: string } },
): Promise<Response> {
  const user = await getCurrentUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id, docId } = params

  if (user.role !== 'ADMIN' && user.supplierId !== id) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const document = await prisma.document.findUnique({
    where: { id: docId },
  })

  if (!document || document.supplierId !== id) {
    return new Response(JSON.stringify({ error: 'Document not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const filePath = path.join(process.cwd(), 'public', document.fileUrl)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const resolvedFilePath = path.resolve(filePath)
  if (!resolvedFilePath.startsWith(uploadsDir + path.sep) && resolvedFilePath !== uploadsDir) {
    return new Response(JSON.stringify({ error: 'Invalid file path.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  await fs.unlink(resolvedFilePath).catch(() => {
    // If the file is already gone, continue with DB deletion
  })

  await prisma.document.delete({ where: { id: docId } })

  return new Response(null, { status: 204 })
}
