"use client"

import { useState, useTransition, useRef } from "react"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"
import { X, Upload, Loader2, FileText, AlertCircle, MessageCircle, CheckCircle2 } from "lucide-react"
import { reUploadRejectedDocAction } from "@/lib/actions/re-upload-rejected-doc"
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/constants/roles"

type RejectedDoc = {
  id: string
  application_id: string
  application_number: string
  document_type: string
  file_name: string
  review_notes: string | null
  reviewed_at: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  rejectedDoc: RejectedDoc
  clientId: string
}

const MAX_FILE_SIZE_MB = 15
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

/**
 * Modal para que el cliente re-suba un doc rechazado.
 *
 * Foco UX: el motivo del rechazo tiene que estar BIEN VISIBLE arriba,
 * antes del dropzone, para que el cliente no suba el mismo error otra vez.
 */
export function ClienteResubirDocModal({
  open,
  onClose,
  rejectedDoc,
  clientId,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isUploading, startUpload] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const label =
    DOCUMENT_TYPE_LABELS[rejectedDoc.document_type as DocumentType] ??
    rejectedDoc.document_type

  const resetForm = () => {
    setFile(null)
    setErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleClose = () => {
    if (isUploading) return
    resetForm()
    onClose()
  }

  const handleFilePick = (picked: File | null) => {
    setErrors((e) => ({ ...e, file: "" }))
    if (!picked) {
      setFile(null)
      return
    }
    if (picked.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrors((e) => ({
        ...e,
        file: `El archivo supera ${MAX_FILE_SIZE_MB}MB`,
      }))
      return
    }
    if (!ALLOWED_MIME.includes(picked.type)) {
      setErrors((e) => ({
        ...e,
        file: "Formato no permitido. Aceptamos PDF, imágenes, Excel o Word",
      }))
      return
    }
    setFile(picked)
  }

  const handleSubmit = () => {
    setErrors({})
    if (!file) {
      setErrors({ file: "Seleccioná un archivo" })
      toast.error("Seleccioná un archivo antes de continuar")
      return
    }

    startUpload(async () => {
      try {
        // 1. Subir el archivo al Storage
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const safeName = file!.name.replace(/[^\w.\-]/g, "_")
        const filePath = `${clientId}/${rejectedDoc.application_id}/resubido-${Date.now()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file!, {
            contentType: file!.type,
            upsert: false,
          })

        if (uploadError) {
          toast.error(`Error subiendo archivo: ${uploadError.message}`)
          return
        }

        // 2. Registrar el nuevo documento en DB (versionado)
        const res = await reUploadRejectedDocAction({
          rejected_document_id: rejectedDoc.id,
          file_name: file!.name,
          file_path: filePath,
          file_size_bytes: file!.size,
          mime_type: file!.type,
        })

        if (!res.ok) {
          // Limpiar archivo huérfano en Storage
          await supabase.storage.from("documents").remove([filePath]).catch(() => {})
          toast.error(res.error)
          return
        }

        toast.success(
          "Gracias, recibimos tu documento. Lo vamos a revisar en breve."
        )
        resetForm()
        onClose()
      } catch (err) {
        toast.error("Error inesperado subiendo el documento")
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <Upload className="h-4 w-4 text-[#1b38e8] shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              Volver a subir: {label}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50 shrink-0"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Motivo del rechazo - siempre arriba, bien visible */}
          {rejectedDoc.review_notes ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-red-700 mb-1">
                    Qué corregir
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {rejectedDoc.review_notes}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Archivo anterior (para referencia) */}
          <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                El archivo que mandaste antes
              </p>
              <p className="text-xs text-gray-700 font-mono truncate">
                {rejectedDoc.file_name}
              </p>
            </div>
          </div>

          {/* Dropzone nuevo archivo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Subí el documento corregido
            </label>
            <div
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                errors.file
                  ? "border-red-300 bg-red-50/50"
                  : file
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-gray-300 hover:border-[#1b38e8] hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx"
                onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
                disabled={isUploading}
                className="hidden"
                id="cliente-resubir-file"
              />
              <label
                htmlFor="cliente-resubir-file"
                className="cursor-pointer block"
              >
                {file ? (
                  <div className="space-y-1">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {(file.size / 1024).toFixed(0)} KB · Clic para cambiar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-7 w-7 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-700">
                      Clic para seleccionar un archivo
                    </p>
                    <p className="text-[11px] text-gray-500">
                      PDF, imágenes, Excel o Word · máx {MAX_FILE_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </label>
            </div>
            {errors.file ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.file}
              </p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || !file}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Subir documento corregido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
