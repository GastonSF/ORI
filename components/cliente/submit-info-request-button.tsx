"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Send,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Package,
  FileText,
  Coins,
} from "lucide-react"
import { submitInfoRequestAction } from "@/lib/actions/submit-info-request"

type Props = {
  applicationId: string
  applicationNumber: string
  // Resumen de lo que se va a enviar (calculado en el server component)
  summary: {
    carteraSubidos: number
    carteraSugeridos: number
    politicaOriginacionOk: boolean
    cobranzaCanales: number
    cobranzaCodigosCompletos: number
    cobranzaCodigosExcluidos: number
    cobranzaCodigosTotal: number
  }
  disabled?: boolean
}

/**
 * Botón "Enviar pedido a WORCAP" con modal de confirmación.
 *
 * Al clickear:
 *   1. Abre un modal con resumen de lo que se va a enviar
 *   2. Cliente confirma → llama submitInfoRequestAction
 *   3. Si OK → redirige al dashboard con flash de success
 *   4. Si falla → muestra lista específica de qué falta
 */
export function SubmitInfoRequestButton({
  applicationId,
  applicationNumber,
  summary,
  disabled = false,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<string[] | null>(null)

  const handleOpen = () => {
    setError(null)
    setMissing(null)
    setOpen(true)
  }

  const handleClose = () => {
    if (pending) return
    setOpen(false)
    setError(null)
    setMissing(null)
  }

  const handleConfirm = () => {
    setError(null)
    setMissing(null)
    startTransition(async () => {
      const result = await submitInfoRequestAction({
        application_id: applicationId,
      })
      if (!result.ok) {
        setError(result.error)
        setMissing(result.missing ?? null)
        return
      }
      // Éxito: cerrar modal y redirigir
      setOpen(false)
      router.push("/cliente?submitted=info_request")
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="h-4 w-4" />
        Enviar pedido de información
      </button>

      {/* Modal de confirmación */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-[#eff3ff] grid place-items-center">
                  <Send className="h-4 w-4 text-[#1b38e8]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Enviar pedido a WORCAP
                  </h2>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {applicationNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">
                Estás por enviar tu pedido de información a WORCAP. Una vez
                enviado, el oficial va a revisar todo. <strong>No vas a poder
                modificar nada</strong> hasta que te lo devuelvan con observaciones
                (si las hay).
              </p>

              {/* Resumen visual */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Lo que vas a enviar
                </p>

                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-[#eff3ff] grid place-items-center shrink-0">
                    <Package className="h-3.5 w-3.5 text-[#1b38e8]" />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium text-gray-900">
                      Composición de cartera
                    </p>
                    <p className="text-xs text-gray-600">
                      {summary.carteraSubidos} de {summary.carteraSugeridos} archivos sugeridos subidos
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-[#eff3ff] grid place-items-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-[#1b38e8]" />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium text-gray-900">
                      Política de originación
                    </p>
                    <p className="text-xs text-gray-600">
                      {summary.politicaOriginacionOk
                        ? "Documento subido"
                        : "Sin subir"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-[#eff3ff] grid place-items-center shrink-0">
                    <Coins className="h-3.5 w-3.5 text-[#1b38e8]" />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium text-gray-900">
                      Política de cobranza
                    </p>
                    <p className="text-xs text-gray-600">
                      {summary.cobranzaCanales} canal
                      {summary.cobranzaCanales !== 1 ? "es" : ""} de cobranza
                      {summary.cobranzaCodigosTotal > 0 && (
                        <>
                          {" · "}
                          {summary.cobranzaCodigosCompletos} código
                          {summary.cobranzaCodigosCompletos !== 1 ? "s" : ""} completo
                          {summary.cobranzaCodigosCompletos !== 1 ? "s" : ""}
                          {summary.cobranzaCodigosExcluidos > 0 && (
                            <>
                              , {summary.cobranzaCodigosExcluidos} excluido
                              {summary.cobranzaCodigosExcluidos !== 1 ? "s" : ""}
                            </>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de items faltantes (si la action devolvió error) */}
              {missing && missing.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Antes de enviar, completá:
                  </p>
                  <ul className="space-y-1 text-xs text-amber-800 list-disc list-inside">
                    {missing.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error genérico */}
              {error && !missing && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-semibold hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirmar y enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
