"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { X, XCircle, Loader2, AlertTriangle } from "lucide-react"
import { rejectDocumentAction } from "@/lib/actions/review-document"

type Props = {
  open: boolean
  onClose: () => void
  documentId: string
  documentLabel: string
  fileName: string
}

const MIN_LEN = 10
const MAX_LEN = 500

// Sugerencias rápidas para ayudar al oficial a ser específico.
const QUICK_REASONS = [
  "La imagen está borrosa o ilegible, no puedo leer los datos.",
  "El documento está vencido, necesito uno actualizado.",
  "Subiste otro archivo distinto al que te pedimos.",
  "Faltan páginas del documento (subiste solo una parte).",
  "El documento no tiene firma o sello oficial.",
]

export function LegajoRejectDocModal({
  open,
  onClose,
  documentId,
  documentLabel,
  fileName,
}: Props) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  const reset = () => {
    setReason("")
    setError(null)
  }

  const handleClose = () => {
    if (isPending) return
    reset()
    onClose()
  }

  const handleSubmit = () => {
    setError(null)
    const trimmed = reason.trim()
    if (trimmed.length < MIN_LEN) {
      setError(`El motivo tiene que tener al menos ${MIN_LEN} caracteres`)
      return
    }

    startTransition(async () => {
      const res = await rejectDocumentAction({
        document_id: documentId,
        reason: trimmed,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`${documentLabel} fue rechazado, el cliente recibirá el aviso`)
      reset()
      onClose()
    })
  }

  const charCount = reason.trim().length
  const isValid = charCount >= MIN_LEN && charCount <= MAX_LEN

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
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Rechazar documento
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Qué estás rechazando */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Documento a rechazar
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {documentLabel}
            </p>
            <p className="text-[11px] text-gray-500 font-mono truncate">
              {fileName}
            </p>
          </div>

          {/* Aviso de por qué se le cuenta al cliente */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700">
              <p className="font-medium text-gray-900">
                El cliente va a recibir este motivo
              </p>
              <p className="mt-0.5">
                Escribilo en tono amable y específico para que sepa qué tiene que corregir.
                Acordate que lo va a leer una persona.
              </p>
            </div>
          </div>

          {/* Sugerencias rápidas */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1.5">
              Sugerencias rápidas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  disabled={isPending}
                  className="text-[11px] px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors text-left"
                >
                  {r.length > 45 ? r.slice(0, 45) + "…" : r}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea del motivo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Motivo del rechazo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              placeholder="Ej: La foto del DNI está borrosa, no se puede leer el número. Intentá sacarla con buena luz y sin flash."
              rows={4}
              maxLength={MAX_LEN + 50}
              className={`w-full text-sm text-gray-900 bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none ${
                error ? "border-red-300" : "border-gray-200"
              }`}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">
                Se guarda en el log de auditoría
              </p>
              <p
                className={`text-[10px] ${
                  charCount > MAX_LEN
                    ? "text-red-600 font-medium"
                    : charCount >= MIN_LEN
                    ? "text-emerald-600"
                    : "text-gray-400"
                }`}
              >
                {charCount} / {MIN_LEN} mínimos · máx {MAX_LEN}
              </p>
            </div>
            {error ? (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !isValid}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Rechazando...
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Rechazar documento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
