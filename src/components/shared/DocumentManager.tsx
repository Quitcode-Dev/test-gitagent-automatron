'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Document, DocumentType } from '@prisma/client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/formatters'
import { useToast } from '@/lib/use-toast'

interface DocumentManagerProps {
  supplierId: string
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  COMPLIANCE: 'Compliance',
  CERTIFICATE: 'Certificate',
  OTHER: 'Other',
}

const DOCUMENT_TYPE_VARIANTS: Record<DocumentType, 'default' | 'info' | 'success' | 'secondary'> =
  {
    COMPLIANCE: 'info',
    CERTIFICATE: 'success',
    OTHER: 'secondary',
  }

export function DocumentManager({ supplierId }: DocumentManagerProps) {
  const { toast } = useToast()

  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocumentType | ''>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = useCallback(() => {
    setLoadingDocs(true)
    fetch(`/api/suppliers/${supplierId}/documents`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load documents (${res.status})`)
        return res.json()
      })
      .then((data: Document[]) => setDocuments(data))
      .catch((err: unknown) => {
        toast({
          title: 'Failed to load documents',
          description: err instanceof Error ? err.message : 'An unexpected error occurred.',
          variant: 'destructive',
        })
      })
      .finally(() => setLoadingDocs(false))
  }, [supplierId, toast])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  async function handleUpload() {
    if (!selectedFile || !docType) {
      toast({
        title: 'Missing fields',
        description: 'Please select a file and document type before uploading.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentType', docType)

      const res = await fetch(`/api/suppliers/${supplierId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        let errorMessage = 'Unable to upload document. Please try again.'
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
          // JSON parsing failed; keep default message
        }
        toast({ title: 'Upload failed', description: errorMessage, variant: 'destructive' })
        return
      }

      toast({ title: 'Document uploaded', description: 'The document was uploaded successfully.' })
      setSelectedFile(null)
      setDocType('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchDocuments()
    } catch {
      toast({
        title: 'Upload failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/documents/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        let errorMessage = 'Unable to delete document. Please try again.'
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
          // JSON parsing failed; keep default message
        }
        toast({ title: 'Delete failed', description: errorMessage, variant: 'destructive' })
        return
      }

      toast({ title: 'Document deleted', description: 'The document was removed successfully.' })
      fetchDocuments()
    } catch {
      toast({
        title: 'Delete failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <>
      {/* Upload form */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-file">File</Label>
          <Input
            id="doc-file"
            ref={fileInputRef}
            type="file"
            className="w-64"
            onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-type">Document type</Label>
          <Select
            value={docType}
            onValueChange={val => {
              if (val === 'COMPLIANCE' || val === 'CERTIFICATE' || val === 'OTHER') {
                setDocType(val)
              }
            }}
            disabled={uploading}
          >
            <SelectTrigger id="doc-type" className="w-44">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPLIANCE">Compliance</SelectItem>
              <SelectItem value="CERTIFICATE">Certificate</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      {/* Document list */}
      {loadingDocs ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map(doc => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.fileName}</TableCell>
                <TableCell>
                  <Badge variant={DOCUMENT_TYPE_VARIANTS[doc.documentType]}>
                    {DOCUMENT_TYPE_LABELS[doc.documentType]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(() => {
                    const d = new Date(doc.uploadedAt)
                    return isNaN(d.getTime()) ? '—' : formatDate(d)
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.fileName}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
