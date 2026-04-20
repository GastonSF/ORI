"use client"

import { useState, useTransition } from "react"
import { Loader2, XCircle } from "lucide-react"
import { cancelApplicationAction } from "@/lib/actions/application"

export function CancelApplicationButton({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleCancel = () => {
    if (reason.trim().length < 5) {
      setError("Indicá el motivo (mínimo 5 caracteres)")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await cancelApplicationAction({
        application_id: applicationId,
        reason: reason.trim(),
      })
      if (result && !result.ok) {
        setError(result.error)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
      >
        <XCircle className="h-3.5 w-3.5" />
        Cancelar solicitud
      </button>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => !pending && setOpen(false)}
        aria-hidden
      />
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <h2 id="cancel-title" className="text-lg font-semibold text-gray-900">
            Cancelar solicitud
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Contanos por qué querés cancelar. Una vez cancelada, podrás iniciar una nueva
            solicitud cuando quieras.
          </p>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Motivo
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Ej: Encontré financiación por otro canal..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8]"
          />
          <p className="mt-1 text-xs text-gray-500">{reason.length}/500</p>

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Volver
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleCancel}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cancelando...
                </span>
              ) : (
                "Sí, cancelar"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
