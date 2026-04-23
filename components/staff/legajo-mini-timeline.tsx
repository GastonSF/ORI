import {
  getStatusBucket,
  getTimelineIndex,
  TIMELINE_STEPS,
  type ApplicationStatus,
} from "@/lib/constants/roles"

type Variant = "compact" | "full"

type Props = {
  status: ApplicationStatus
  variant?: Variant
}

/**
 * Mini-timeline visual del legajo en idioma del cliente.
 *
 * Los 8 pasos alternan entre acciones del cliente y acciones de WORCAP:
 *  1. Contanos sobre vos          (cliente)
 *  2. Subí tu documentación       (cliente)
 *  3. Revisamos tus documentos    (worcap)
 *  4. Elegí tu línea de crédito   (cliente)
 *  5. Sumá la documentación...    (cliente)
 *  6. Revisamos lo que sumaste    (worcap)
 *  7. Analizamos tu solicitud     (worcap)
 *  8. Tenés una respuesta         (worcap)
 *
 * Estados visuales:
 *  - Completados: dot azul sólido
 *  - Actual: dot azul con ring
 *  - Futuros: dot gris
 *  - Aprobado: todos los dots verdes, último con ring verde
 *  - Rechazado/cancelado: último dot rojo con ring rojo
 */

// Labels en idioma del cliente alineados al índice de TIMELINE_STEPS
const CLIENT_LABELS: string[] = [
  "Contanos sobre vos",
  "Subí tu documentación",
  "Revisamos tus documentos",
  "Elegí tu línea de crédito",
  "Sumá la documentación de tu línea",
  "Revisamos lo que sumaste",
  "Analizamos tu solicitud",
  "Tenés una respuesta",
]

// Versión corta para la variante full (labels debajo de cada dot)
const CLIENT_LABELS_SHORT: string[] = [
  "Tus datos",
  "Documentación",
  "Revisión",
  "Línea",
  "Completar",
  "Verificación",
  "Análisis",
  "Respuesta",
]

export function LegajoMiniTimeline({ status, variant = "compact" }: Props) {
  const bucket = getStatusBucket(status)
  const currentIdx = getTimelineIndex(bucket)
  const isRejected = bucket === "rejected" || bucket === "cancelled"
  const isApproved = bucket === "approved"

  const currentStepLabel = CLIENT_LABELS[Math.min(currentIdx, CLIENT_LABELS.length - 1)]

  if (variant === "full") {
    return (
      <div className="flex items-start gap-0">
        {TIMELINE_STEPS.map((_step, idx) => (
          <StepFullItem
            key={idx}
            idx={idx}
            currentIdx={currentIdx}
            label={CLIENT_LABELS_SHORT[idx] ?? ""}
            isRejected={isRejected}
            isApproved={isApproved}
            isLast={idx === TIMELINE_STEPS.length - 1}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {TIMELINE_STEPS.map((_step, idx) => (
          <Dot
            key={idx}
            idx={idx}
            currentIdx={currentIdx}
            isRejected={isRejected}
            isApproved={isApproved}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-500">
        Paso {Math.min(currentIdx + 1, TIMELINE_STEPS.length)}: {currentStepLabel}
      </span>
    </div>
  )
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function Dot({
  idx,
  currentIdx,
  isRejected,
  isApproved,
}: {
  idx: number
  currentIdx: number
  isRejected: boolean
  isApproved: boolean
}) {
  const isCompleted = idx < currentIdx
  const isCurrent = idx === currentIdx
  const isFuture = idx > currentIdx
  const isLastStep = idx === 7

  if (isApproved) {
    if (isLastStep) return <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
    return <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
  }

  if (isRejected) {
    if (isLastStep) return <span className="h-1.5 w-1.5 rounded-full bg-red-600 ring-2 ring-red-200" />
    if (idx < currentIdx) return <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
    return <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
  }

  if (isCompleted) return <span className="h-1.5 w-1.5 rounded-full bg-[#1b38e8]" />
  if (isCurrent) return <span className="h-1.5 w-1.5 rounded-full bg-[#1b38e8] ring-2 ring-[#c7d0fb]" />
  if (isFuture) return <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
  return null
}

function StepFullItem({
  idx,
  currentIdx,
  label,
  isRejected,
  isApproved,
  isLast,
}: {
  idx: number
  currentIdx: number
  label: string
  isRejected: boolean
  isApproved: boolean
  isLast: boolean
}) {
  const isCompleted = idx < currentIdx
  const isCurrent = idx === currentIdx
  const colorClasses = isApproved
    ? "text-emerald-700"
    : isRejected && isLast
    ? "text-red-700"
    : isCompleted
    ? "text-[#1b38e8]"
    : isCurrent
    ? "text-[#1b38e8] font-semibold"
    : "text-gray-400"

  return (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
      <Dot idx={idx} currentIdx={currentIdx} isRejected={isRejected} isApproved={isApproved} />
      <span className={`text-[9px] text-center truncate w-full ${colorClasses}`}>{label}</span>
    </div>
  )
}
