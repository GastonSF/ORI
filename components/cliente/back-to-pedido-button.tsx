import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

type Props = {
  /**
   * Si la sección está completa, mostramos un mensaje de confirmación
   * arriba del botón. Si no, solo el botón.
   */
  isComplete?: boolean
  /**
   * Texto custom para mostrar arriba (sobreescribe el default).
   */
  customMessage?: string
}

/**
 * Footer estandar de las subpáginas del pedido de información.
 *
 * Muestra:
 *  - (opcional) Mensaje de "guardado / completo"
 *  - Botón grande para volver al índice
 *
 * Aparece al final de cartera, política de originación y cobranza.
 */
export function BackToPedidoButton({
  isComplete = false,
  customMessage,
}: Props) {
  const message =
    customMessage ??
    (isComplete
      ? "Esta sección está completa. Tu progreso se guardó automáticamente."
      : "Tu progreso se guarda automáticamente. Podés seguir más tarde.")

  return (
    <div className="border-t border-gray-200 pt-5 mt-5">
      <div className="flex items-center gap-2 mb-3 text-sm">
        {isComplete ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-emerald-700">{message}</p>
          </>
        ) : (
          <p className="text-gray-600">{message}</p>
        )}
      </div>
      <Link
        href="/cliente/pedido-informacion"
        className="inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al pedido de información
      </Link>
    </div>
  )
}
