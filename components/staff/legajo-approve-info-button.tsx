"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  ArrowRight,
  Send,
} from "lucide-react"
import { approveInfoRequestAction } from "@/lib/actions/approve-info-request"

type Props = {
  applicationId: string
  applicationNumber: string
  // Resumen de lo que el cliente envió, para mostrar en el modal
  cobranzaCanales: number
  cobranzaCodigosCompletos: number
  cobranzaCodigosExcluidos: number
  cobranzaCodigosTotal: number
}

/**
 * Botón "Aprobar pedido de información" para el oficial.
 *
 * Aparece en el legajo del staff cuando:
 *   - Status = additional_docs_review
 *   - El usuario es el oficial asignado (o admin)
 *
 * Al clickear:
 *   1. Abre modal de confirmación con resumen del árbol
 *   2. Si confirma → llama approveInfoRequestAction
 *   3. Si OK → router.refresh() para recargar el legajo (que ahora estará
 *      en in_risk_analysis y mostrará el dictamen del analista)
 *   4. Si falla → mensaje de error
 */
export function LegajoApproveInfoButton({
  applicationId,
  applicationNumber,
  cobranzaCanales,
  cobranzaCodigosCompletos,
  cobranzaCodigosExcluidos,
  cobranzaCodigosTotal,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleOpen = () => {
    setError(null)
    setOpen(true)
  }

  const handleClose = () => {
    if (pending) return
    setOpen(false)
    setError(null)
  }

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await approveInfoRequestAction({
        application_id: applicationId,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Éxito: cerrar modal y recargar el legajo
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-100">
          <h2 className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
            Pedido listo para revisar
          </h2>
        </div>
        <div className="p-4">
          <p className="text-xs text-emerald-900 leading-relaxed mb-3">
            El cliente terminó de cargar la información de cartera, política de
            originación y el árbol de cobranza. Si todo te parece bien, aprobá
            el pedido para mandarlo al analista de riesgo.
          </p>
          <button
            type="button"
            onClick={handleOpen}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprobar pedido de información
          </button>
        </div>
      </section>

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
                <div className="h-8 w-8 rounded-md bg-emerald-50 grid place-items-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Aprobar pedido de información
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
                Vas a aprobar el pedido de información del cliente. El legajo
                pasará a <strong>análisis de riesgo</strong> y será asignado al
                analista para que cargue el dictamen.
              </p>

              {/* Resumen de lo que recibió */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Resumen del árbol de cobranza
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1b38e8] shrink-0" />
                    {cobranzaCanales} canal{cobranzaCanales !== 1 ? "es" : ""} de cobranza
                  </li>
                  {cobranzaCodigosTotal > 0 && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                        {cobranzaCodigosCompletos} código
                        {cobranzaCodigosCompletos !== 1 ? "s" : ""} completo
                        {cobranzaCodigosCompletos !== 1 ? "s" : ""}
                      </li>
                      {cobranzaCodigosExcluidos > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                          {cobranzaCodigosExcluidos} código
                          {cobranzaCodigosExcluidos !== 1 ? "s" : ""} excluido
                          {cobranzaCodigosExcluidos !== 1 ? "s" : ""}
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>

              {/* Próximo paso visual */}
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-md p-3">
                <Send className="h-3.5 w-3.5 text-[#1b38e8] shrink-0" />
                <span>
                  Después de aprobar, el legajo aparecerá en la cola del analista
                  de riesgo.
                </span>
              </div>

              {/* Error si falló */}
              {error && (
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
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Aprobando...
                  </>
                ) : (
                  <>
                    Confirmar y mandar a riesgo
                    <ArrowRight className="h-3.5 w-3.5" />
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
