"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  Loader2,
  Trash2,
  CircleDashed,
} from "lucide-react"
import {
  prepareAdditionalDocumentUploadAction,
  confirmAdditionalDocumentUploadAction,
  deleteAdditionalDocumentAction,
} from "@/lib/actions/additional-documents"

type Props = {
  request: {
    id: string
    document_name: string
    description: string | null
    is_required: boolean
    status: "pending" | "fulfilled" | "approved" | "rejected" | "cancelled"
    review_notes: string | null
    fulfilled_by_document_id: string | null
  }
  applicationId: string
  existingDoc: {
    id: string
    file_name: string
    file_size_bytes: number | null
  } | null
  readOnly: boolean
}

const MAX_SIZE_MB = 25

export function AdditionalDocumentRow({
  request,
  applicationId,
  existingDoc,
  readOnly,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isApproved = request.status === "approved"
  const isRejected = request.status === "rejected"
  const hasFile = !!existingDoc

  const onPick = () => fileInputRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo es demasiado grande (máximo ${MAX_SIZE_MB} MB)`)
      e.target.value = ""
      return
    }

    setUploading(true)

    try {
      const prep = await prepareAdditionalDocumentUploadAction({
        application_id: applicationId,
        request_id: request.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
      })
      if (!prep.ok || !prep.data) {
        setError(prep.ok ? "Error preparando subida" : prep.error)
        setUploading(false)
        e.target.value = ""
        return
      }

      const uploadRes = await fetch(prep.data.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      })

      if (!uploadRes.ok) {
        setError("Error subiendo el archivo. Intentá de nuevo.")
        setUploading(false)
        e.target.value = ""
        return
      }

      const confirm = await confirmAdditionalDocumentUploadAction({
        document_id: prep.data.document_id,
        request_id: request.id,
      })
      if (!confirm.ok) {
        setError(confirm.error)
        setUploading(false)
        e.target.value = ""
        return
      }

      setUploading(false)
      e.target.value = ""
      router.refresh()
    } catch {
      setError("Error inesperado. Intentá de nuevo.")
      setUploading(false)
      e.target.value = ""
    }
  }

  const onDelete = async () => {
    if (!existingDoc) return
    if (!confirm("¿Querés eliminar este archivo?")) return
    setDeleting(true)
    setError(null)
    const res = await deleteAdditionalDocumentAction({
      document_id: existingDoc.id,
      request_id: request.id,
    })
    if (!res.ok) {
      setError(res.error)
      setDeleting(false)
      return
    }
    setDeleting(false)
    router.refresh()
  }

  // Visual del icono de estado
  let StatusIcon = CircleDashed
  let iconClass = "text-gray-300"
  if (isApproved) {
    StatusIcon = CheckCircle2
    iconClass = "text-green-600"
  } else if (isRejected) {
    StatusIcon = AlertCircle
    iconClass = "text-red-600"
  } else if (hasFile) {
    StatusIcon = CheckCircle2
    iconClass = "text-[#1b38e8]"
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <StatusIcon className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {request.document_name}
                {!request.is_required && (
                  <span className="text-xs font-normal text-gray-500">
                    (opcional)
                  </span>
                )}
              </p>
              {request.description && (
                <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                  {request.description}
                </p>
              )}
              {existingDoc && (
                <p className="mt-1.5 text-xs text-[#1b38e8] font-mono break-all">
                  {existingDoc.file_name}
                  {existingDoc.file_size_bytes != null && (
                    <span className="ml-1.5 text-gray-500 font-sans">
                      · {(existingDoc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {hasFile ? (
                <>
                  <button
                    type="button"
                    onClick={onPick}
                    disabled={uploading || deleting}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={uploading || deleting}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onPick}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-md bg-[#1b38e8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Subiendo
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3" /> Subir
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {request.review_notes && isRejected && (
            <p className="mt-2 text-xs text-red-700 bg-red-50 rounded-md p-2 border border-red-100">
              <strong>Observación:</strong> {request.review_notes}
            </p>
          )}

          {error && (
            <p className="mt-2 text-xs text-red-700 bg-red-50 rounded-md p-2 border border-red-100">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/jpeg,image/png,image/webp,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onFile}
      />
    </li>
  )
}
