import {
  getStatusBucket,
  getTimelineIndex,
  TIMELINE_STEPS,
  type ApplicationStatus,
} from "@/lib/constants/roles"

type Variant = "compact" | "full"

type Props = {
  status: ApplicationStatus
  /**
   * compact = 8 dots + label del paso actual al costado (default)
   * full    = 8 dots con labels debajo (uso especial, más espacio)
   */
  variant?: Variant
}

/**
 * Mini-timeline visual del legajo.
 *
 * Muestra los 8 pasos como dots:
 *  - Completados (anteriores al actual): azul sólido
 *  - Actual: azul con ring
 *  - Futuros: gris
 *  - Si el legajo terminó en rejected/cancelled: el último dot va rojo/gris sin ring
 *
 * Se renderiza en línea con la info del legajo en bandejas y listas.
 */
export function LegajoMiniTimeline({ status, variant = "compact" }: Props) {
  const bucket = getStatusBucket(status)
  const currentIdx = getTimelineIndex(bucket)
  const isRejected = bucket === "rejected" || bucket === "cancelled"
  const isApproved = bucket === "approved"

  const currentStep = TIMELINE_STEPS[currentIdx]

  if (variant === "full") {
    return (
      <div className="flex items-start gap-0">
        {TIMELINE_STEPS.map((step, idx) => (
          <StepFullItem
            key={step.bucket}
            idx={idx}
            currentIdx={currentIdx}
            label={step.shortLabel}
            isRejected={isRejected}
            isApproved={isApproved}
            isLast={idx === TIMELINE_STEPS.length - 1}
          />
        ))}
      </div>
    )
  }

  // Compact
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {TIMELINE_STEPS.map((step, idx) => (
          <Dot
            key={step.bucket}
            idx={idx}
            currentIdx={currentIdx}
            isRejected={isRejected}
            isApproved={isApproved}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-500">
        Paso {Math.min(currentIdx + 1, TIMELINE_STEPS.length)}
        {currentStep ? `: ${currentStep.shortLabel}` : ""}
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

  // Caso especial: si el legajo está aprobado, todos los dots completos + el último con ring verde
  if (isApproved) {
    if (isLastStep) {
      return <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
    }
    return <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
  }

  // Caso especial: si terminó rechazado/cancelado, el último dot rojo
  if (isRejected) {
    if (isLastStep) {
      return <span className="h-1.5 w-1.5 rounded-full bg-red-600 ring-2 ring-red-200" />
    }
    if (idx < currentIdx) {
      return <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
    }
    return <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
  }

  // Flujo normal
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
