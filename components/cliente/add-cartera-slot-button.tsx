"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, X } from "lucide-react"
import { addCarteraSlotAction } from "@/lib/actions/cartera-slot"

type Props = {
  applicationId: string
}

/**
 * Botón "Agregar otro archivo" para la página de cartera.
 *
 * Abre un modal que pide un nombre custom para el slot.
 * Llama a addCarteraSlotAction y refresca la página.
 */
export function AddCarteraSlotButton({ applicationId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!label.trim()) {
      setError("Ponele un nombre al archivo")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addCarteraSlotAction({
        application_id: applicationId,
        custom_label: label,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setLabel("")
      setOpen(false)
      router.refresh()
    })
  }

  const handleClose = () => {
    if (pending) return
    setOpen(false)
    setLabel("")
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-[#1b38e8] hover:text-[#1b38e8] hover:bg-[#f7f9ff] transition-colors"
      >
        <Plus className="h-4 w-4" />
        Agregar otro archivo
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">
                Agregar archivo de cartera
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                ¿Cómo querés llamar a este archivo? Elegí un nombre que te ayude a identificarlo.
              </p>

              <div>
                <label
                  htmlFor="cartera-label"
                  className="block text-xs font-medium text-gray-700 mb-1.5"
                >
                  Nombre del archivo
                </label>
                <input
                  id="cartera-label"
                  type="text"
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value)
                    if (error) setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !pending) {
                      handleSubmit()
                    }
                  }}
                  placeholder="Ej: Mora detallada, Cartera por canal..."
                  maxLength={80}
                  disabled={pending}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b38e8] focus:border-transparent disabled:opacity-50"
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  {label.length}/80 caracteres
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-700 bg-red-50 rounded-md p-2 border border-red-100">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending || !label.trim()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-semibold hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar archivo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
