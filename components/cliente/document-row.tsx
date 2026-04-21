"use client"

import { useRef, useState, useTransition } from "react"
import { CheckCircle2, Eye, Loader2, Trash2, Upload, XCircle, AlertCircle } from "lucide-react"
import type { DocumentType } from "@/lib/constants/roles"
import { uploadDocumentAction, deleteDocumentAction } from "@/lib/actions/documents"
import { DOCUMENT_STATUS_LABELS, type DocumentStatus } from "@/lib/constants/roles"
import { DocumentPreviewModal } from "@/components/cliente/document-preview-modal"

type ExistingDoc = {
  id: string
  file_name: string
  file_size_bytes: number | null
  mime_type?: string | null
  status: string
} | null

type Props = {
  docType: DocumentType
  label: string
  applicationId: string
  clientId: string
  existingDoc: ExistingDoc
}

export function DocumentRow({ docType, label, applicationId, clientId, existingDoc }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.size > 25 * 1024 * 1024) {
      setError("El archivo supera los 25 MB")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append(
      "metadata",
      JSON.stringify({
        application_id: applicationId,
        client_id: clientId,
        document_type: docType,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || "application/octet-stream",
      })
    )

    startTransition(async () => {
      const result = await uploadDocumentAction(formData)
      if (!result.ok) setError(result.error)
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  const handleDelete = () => {
    if (!existingDoc) return
    if (!confirm(`¿Eliminar ${existingDoc.file_name}?`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteDocumentAction({ document_id: existingDoc.id })
      if (!result.ok) setError(result.error)
    })
  }

  const status = (existingDoc?.status ?? "pending") as DocumentStatus

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <StatusIcon status={status} hasDoc={!!existingDoc} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{label}</p>
          {existingDoc ? (
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              <DocumentPreviewModal
                documentId={existingDoc.id}
                fileName={existingDoc.file_name}
                mimeType={existingDoc.mime_type}
                triggerClassName="truncate text-[#1b38e8] hover:underline font-medium"
              >
                {existingDoc.file_name}
              </DocumentPreviewModal>
              {existingDoc.file_size_bytes && (
                <span className="shrink-0">· {formatBytes(existingDoc.file_size_bytes)}</span>
              )}
              <StatusBadge status={status} />
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500">Pendiente de subida</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {existingDoc ? (
            <>
              <DocumentPreviewModal
                documentId={existingDoc.id}
                fileName={existingDoc.file_name}
                mimeType={existingDoc.mime_type}
                triggerClassName="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-3.5 w-3.5" /> Ver
              </DocumentPreviewModal>
              {status !== "approved" && (
                <>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={pending}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={pending}
                    className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-400 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Subir
                </>
              )}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,application/pdf,image/*"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </li>
  )
}

function StatusIcon({ status, hasDoc }: { status: DocumentStatus; hasDoc: boolean }) {
  if (!hasDoc) {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-100 grid place-items-center shrink-0">
        <AlertCircle className="h-4 w-4 text-gray-400" />
      </div>
    )
  }
  if (status === "approved") {
    return (
      <div className="h-8 w-8 rounded-full bg-green-50 grid place-items-center shrink-0">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      </div>
    )
  }
  if (status === "rejected") {
    return (
      <div className="h-8 w-8 rounded-full bg-red-50 grid place-items-center shrink-0">
        <XCircle className="h-4 w-4 text-red-600" />
      </div>
    )
  }
  return (
    <div className="h-8 w-8 rounded-full bg-blue-50 grid place-items-center shrink-0">
      <CheckCircle2 className="h-4 w-4 text-[#1b38e8]" />
    </div>
  )
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles: Record<DocumentStatus, string> = {
    pending: "bg-gray-100 text-gray-700",
    uploaded: "bg-blue-50 text-[#1b38e8]",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
  }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
