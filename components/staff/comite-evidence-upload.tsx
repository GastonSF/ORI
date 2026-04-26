"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  Loader2,
  Trash2,
  AlertCircle,
  Mail,
  ExternalLink,
  ImageIcon,
  FileText,
} from "lucide-react"
import {
  prepareComiteEvidenceUploadAction,
  confirmComiteEvidenceUploadAction,
  deleteComiteEvidenceAction,
} from "@/lib/actions/upload-comite-evidence"

type Props = {
  applicationId: string
  // Si ya hay un comprobante subido, se pasa acá para mostrarlo
  existingDoc: {
    id: string
    file_name: string
    file_size_bytes: number | null
    mime_type: string | null
    signed_url: string | null
  } | null
  // Si el dictamen ya existe, los cambios se guardan automáticamente.
  // Si no existe (form en blanco), el doc_id se reporta al padre via callback.
  onUploaded?: (docId: string | null) => void
  readOnly?: boolean
}

const MAX_SIZE_MB = 10

/**
 * Componente para subir el comprobante del comité de riesgo
 * (típicamente un screenshot del mail).
 *
 * Diseño:
 *   - Caja gris clarita con icono de mail + label arriba
 *   - Si no hay archivo: botón grande "Subir comprobante"
 *   - Si hay archivo:
 *     - Si es imagen → preview thumbnail
 *     - Si es PDF/otro → ícono + nombre
 *     - Botón "Reemplazar" + "Eliminar"
 *   - Etiqueta sutil "Opcional" cerca del label
 *
 * Comportamiento:
 *   - Permite subir antes o después de guardar el dictamen
 *   - Si el dictamen ya existe → linkea automáticamente
 *   - Si no existe → reporta al padre vía onUploaded(docId)
 */
export function ComiteEvidenceUpload({
  applicationId,
  existingDoc,
  onUploaded,
  readOnly = false,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Para el caso "subido pero todavía no linkeado al dictamen"
  const [pendingDoc, setPendingDoc] = useState<{
    id: string
    file_name: string
    file_size_bytes: number
    mime_type: string
  } | null>(null)

  // Resync si cambia el existingDoc (después de router.refresh)
  useEffect(() => {
    if (existingDoc) {
      setPendingDoc(null)
    }
  }, [existingDoc])

  const currentDoc =
    existingDoc ??
    (pendingDoc
      ? {
          id: pendingDoc.id,
          file_name: pendingDoc.file_name,
          file_size_bytes: pendingDoc.file_size_bytes,
          mime_type: pendingDoc.mime_type,
          signed_url: null, // todavía no se generó signed url
        }
      : null)

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
      const prep = await prepareComiteEvidenceUploadAction({
        application_id: applicationId,
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

      // 2. Subir a Storage
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

      // 3. Confirmar (linkea al dictamen si existe)
      const confirm = await confirmComiteEvidenceUploadAction({
        application_id: applicationId,
        document_id: prep.data.document_id,
      })

      if (!confirm.ok) {
        setError(confirm.error)
        setUploading(false)
        e.target.value = ""
        return
      }

      // Reportar al padre el doc_id (para que el form lo incluya al guardar)
      onUploaded?.(prep.data.document_id)

      // Si no hay dictamen todavía, guardamos pending localmente
      if (!existingDoc) {
        setPendingDoc({
          id: prep.data.document_id,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type || "application/octet-stream",
        })
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
    if (!currentDoc) return
    if (!confirm("¿Eliminar este comprobante?")) return

    setDeleting(true)
    setError(null)

    const result = await deleteComiteEvidenceAction({
      application_id: applicationId,
      document_id: currentDoc.id,
    })

    if (!result.ok) {
      setError(result.error)
      setDeleting(false)
      return
    }

    setPendingDoc(null)
    onUploaded?.(null)
    setDeleting(false)
    router.refresh()
  }

  const isImage = currentDoc?.mime_type?.startsWith("image/")
  const sizeMb =
    currentDoc?.file_size_bytes != null
      ? (currentDoc.file_size_bytes / (1024 * 1024)).toFixed(2)
      : null

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-3.5 w-3.5 text-gray-500" />
        <p className="text-xs font-semibold text-gray-700">
          Comprobante del comité de riesgo
        </p>
        <span className="text-[10px] text-gray-500 italic">Opcional</span>
      </div>

      <p className="text-[11px] text-gray-600 mb-2.5 leading-snug">
        Subí una captura del mail del comité con la decisión, para que quede
        registrado quién aprobó.
      </p>

      {/* Sin archivo: botón "Subir" */}
      {!currentDoc && !readOnly && (
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:border-[#1b38e8] hover:text-[#1b38e8] hover:bg-[#f7f9ff] disabled:opacity-50 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Subir comprobante (imagen o PDF)
            </>
          )}
        </button>
      )}

      {/* Sin archivo en read-only */}
      {!currentDoc && readOnly && (
        <p className="text-xs text-gray-500 italic text-center py-2">
          No se subió comprobante.
        </p>
      )}

      {/* Con archivo: preview + acciones */}
      {currentDoc && (
        <div className="rounded-md border border-gray-200 bg-white p-2.5">
          <div className="flex items-start gap-3">
            {/* Thumbnail si es imagen, ícono si es PDF/otro */}
            <div className="shrink-0">
              {isImage && currentDoc.signed_url ? (
                
                  href={currentDoc.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={currentDoc.signed_url}
                    alt="Comprobante del comité"
                    className="h-14 w-14 object-cover rounded border border-gray-200 hover:opacity-80"
                  />
                </a>
              ) : isImage ? (
                <div className="h-14 w-14 rounded border border-gray-200 bg-gray-100 grid place-items-center">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                </div>
              ) : (
                <div className="h-14 w-14 rounded border border-gray-200 bg-red-50 grid place-items-center">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
              )}
            </div>

            {/* Info del archivo */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {currentDoc.file_name}
              </p>
              {sizeMb && (
                <p className="text-[10px] text-gray-500 mt-0.5">{sizeMb} MB</p>
              )}

              {/* Botones */}
              {!readOnly && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {currentDoc.signed_url && (
                    
                      href={currentDoc.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#1b38e8] text-white hover:bg-[#1730c4]"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Ver
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onPick}
                    disabled={uploading || deleting}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <Upload className="h-2.5 w-2.5" />
                    )}
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={uploading || deleting}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-2.5 w-2.5" />
                    )}
                  </button>
                </div>
              )}

              {readOnly && currentDoc.signed_url && (
                
                  href={currentDoc.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#1b38e8] text-white hover:bg-[#1730c4]"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Ver
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 text-[11px] text-red-700 bg-red-50 rounded p-1.5 border border-red-100 flex items-start gap-1">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={onFile}
      />
    </div>
  )
}
