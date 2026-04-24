"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ArrowRight, Loader2, CheckCircle2, X } from "lucide-react"
import {
  FUNDING_LINE_LABELS,
  type FundingLine,
} from "@/lib/constants/roles"
import { advanceToAdditionalDocsAction } from "@/lib/actions/advance-to-additional-docs"

type Props = {
  applicationId: string
  applicationNumber: string
  fundingLine: FundingLine
  // Cuántos docs se van a pedir (preview antes de confirmar)
  previewDocsCount: number
}

/**
 * Botón que el oficial usa para mover un legajo desde "análisis inicial"
 * a "docs específicos de la línea".
 *
 * Se renderiza solo cuando:
 *  - El legajo está en análisis inicial
 *  - Todos los docs iniciales están aprobados
 *  - El legajo tiene línea definida
 *
 * Al clickearlo abre un modal de confirmación que muestra qué va a pasar,
 * evita acciones por accidente.
 */
export function LegajoAdvanceButton({
  applicationId,
  applicationNumber,
  fundingLine,
  previewDocsCount,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const lineLabel = FUNDING_LINE_LABELS[fundingLine]

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await advanceToAdditionalDocsAction({
        application_id: applicationId,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        `Legajo avanzado. Le pedimos ${result.data?.requests_created} documento(s) al cliente.`
      )
      setOpen(false)
    })
  }

  return (
    <>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 grid place-items-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-emerald-900">
              Documentación inicial completa
            </h3>
            <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
              Aprobaste todos los documentos iniciales. Podés pedirle al cliente
              la documentación específica de su línea ({lineLabel}).
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={pending}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Pedir documentación de línea
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">
                Pedir documentación de línea
              </h2>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                Vas a hacer 3 cosas al mismo tiempo:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#1b38e8] font-bold">1.</span>
                  <span className="text-gray-700">
                    Cambiar el estado del legajo{" "}
                    <span className="font-mono font-medium text-gray-900">
                      {applicationNumber}
                    </span>{" "}
                    a{" "}
                    <span className="font-medium text-gray-900">
                      Documentación adicional
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1b38e8] font-bold">2.</span>
                  <span className="text-gray-700">
                    Pedirle al cliente{" "}
                    <span className="font-medium text-gray-900">
                      {previewDocsCount} documento{previewDocsCount !== 1 ? "s" : ""}
                    </span>{" "}
                    según la línea <strong>{lineLabel}</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1b38e8] font-bold">3.</span>
                  <span className="text-gray-700">
                    El cliente recibe el aviso en su dashboard y puede empezar a
                    subir los documentos
                  </span>
                </li>
              </ul>

              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Ojo:</strong> esta acción no se puede deshacer desde el
                panel. Si querés ajustar qué docs pedir, hacelo después desde la
                lista de documentación adicional del legajo.
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
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
                    Avanzando...
                  </>
                ) : (
                  <>
                    Sí, avanzar
                    <ArrowRight className="h-3.5 w-3.5" />
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
