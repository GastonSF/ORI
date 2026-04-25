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
  prepareCodeDocUploadAction,
  confirmCodeDocUploadAction,
  deleteCodeDocumentAction,
} from "@/lib/actions/code-document-upload"

type CodeDocSlot =
  | "autorizacion_descuento"
  | "convenio_nivel_1"
  | "convenio_nivel_2"
  | "autorizacion_mutual_original"

type Props = {
  codeId: string
  slot: CodeDocSlot
  label: string
  helperText?: string
  // Si ya hay archivo subido para este slot
  existingDoc: {
    id: string
    file_name: string
    file_size_bytes: number | null
  } | null
  readOnly?: boolean
}

const MAX_SIZE_MB = 25

/**
 * Slot de upload independiente para uno de los 4 archivos posibles
 * de un código de descuento.
 *
 * Muestra:
 *   - Label + texto de ayuda
 *   - Si no hay archivo: botón "Subir"
 *   - Si hay archivo: nombre + botones "Reemplazar" y eliminar
 *   - Estados de loading y error
 *
 * Usa el flujo de upload directo (no pasa por additional_document_requests):
 * sube a Supabase Storage con URL firmada y linkea el document_id al slot
 * de collection_codes via attachDocToCodeAction.
 */
export function CodeDocUpload({
  codeId,
  slot,
  label,
  helperText,
  existingDoc,
  readOnly = false,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // 1. Preparar
      const prep = await prepareCodeDocUploadAction({
        code_id: codeId,
        slot,
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

      // 2. Subir a Supabase Storage via URL firmada
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

      // 3. Confirmar (linkea el doc al slot del código)
      const confirm = await confirmCodeDocUploadAction({
        code_id: codeId,
        slot,
        document_id: prep.data.document_id,
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
    if (!confirm("¿Eliminar este archivo?")) return

    setDeleting(true)
    setError(null)

    const result = await deleteCodeDocumentAction({
      code_id: codeId,
      slot,
    })

    if (!result.ok) {
      setError(result.error)
      setDeleting(false)
      return
    }

    setDeleting(false)
    router.refresh()
  }

  // Visual del icono de estado
  let StatusIcon = CircleDashed
  let iconClass = "text-gray-300"
  if (hasFile) {
    StatusIcon = CheckCircle2
    iconClass = "text-[#1b38e8]"
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-2.5">
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${iconClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900">{label}</p>
              {helperText && (
                <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">
                  {helperText}
                </p>
              )}
              {existingDoc && (
                <p className="mt-1 text-[11px] text-[#1b38e8] font-mono break-all">
                  {existingDoc.file_name}
                  {existingDoc.file_size_bytes != null && (
                    <span className="ml-1 text-gray-500 font-sans">
                      · {(existingDoc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                </p>
              )}
            </div>

            {!readOnly && (
              <div className="flex items-center gap-1 shrink-0">
                {hasFile ? (
                  <>
                    <button
                      type="button"
                      onClick={onPick}
                      disabled={uploading || deleting}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
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
                    className="inline-flex items-center gap-1 rounded-md bg-[#1b38e8] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Subiendo
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        Subir
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="mt-1.5 text-[11px] text-red-700 bg-red-50 rounded p-1.5 border border-red-100">
              <AlertCircle className="inline h-3 w-3 mr-1" />
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
    </div>
  )
}
