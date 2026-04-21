import { Check, X, FileWarning } from "lucide-react"
import {
  getStatusBucket,
  getTimelineIndex,
  TIMELINE_STEPS,
  type ApplicationStatus,
} from "@/lib/constants/roles"

type Props = {
  status: ApplicationStatus
}

/**
 * Timeline horizontal de 5 pasos del proceso del legajo.
 * Resalta el paso actual según el estado, con colores según éxito/fallo.
 *
 * Estados especiales:
 *  - docs_requested → muestra "Pendiente de recepción" en amarillo (acción del cliente)
 *  - rejected/cancelled → muestra último paso en rojo con ícono X
 *  - approved → muestra último paso en verde con ícono check
 */
export function ApplicationTimeline({ status }: Props) {
  const bucket = getStatusBucket(status)
  const currentIndex = getTimelineIndex(bucket)
  const isDocsRequested = bucket === "docs_requested"
  const isRejected = bucket === "rejected" || bucket === "cancelled"
  const isApproved = bucket === "approved"
  const isFinal = isRejected || isApproved

  return (
    <div className="w-full py-2">
      {/* Versión desktop: horizontal */}
      <ol className="hidden sm:flex items-start justify-between relative">
        {/* Línea de fondo que conecta todos los pasos */}
        <div className="absolute top-4 left-[5%] right-[5%] h-0.5 bg-gray-200 -z-0" />

        {TIMELINE_STEPS.map((step, idx) => {
          const state = getStepState({
            idx,
            currentIndex,
            isDocsRequested,
            isRejected,
            isApproved,
            isFinal,
          })

          return (
            <li
              key={step.bucket}
              className="flex flex-col items-center gap-2 relative z-10 flex-1"
            >
              <StepCircle state={state} index={idx + 1} isLast={idx === TIMELINE_STEPS.length - 1} />
              <StepLabel state={state} label={step.shortLabel} />
            </li>
          )
        })}
      </ol>

      {/* Versión mobile: vertical */}
      <ol className="sm:hidden space-y-3">
        {TIMELINE_STEPS.map((step, idx) => {
          const state = getStepState({
            idx,
            currentIndex,
            isDocsRequested,
            isRejected,
            isApproved,
            isFinal,
          })

          return (
            <li key={step.bucket} className="flex items-center gap-3">
              <StepCircle state={state} index={idx + 1} isLast={idx === TIMELINE_STEPS.length - 1} />
              <StepLabel state={state} label={step.label} />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

type StepState = "done" | "current" | "current-warning" | "current-rejected" | "current-approved" | "pending"

function getStepState({
  idx,
  currentIndex,
  isDocsRequested,
  isRejected,
  isApproved,
  isFinal,
}: {
  idx: number
  currentIndex: number
  isDocsRequested: boolean
  isRejected: boolean
  isApproved: boolean
  isFinal: boolean
}): StepState {
  if (idx < currentIndex) return "done"
  if (idx > currentIndex) return "pending"
  // idx === currentIndex (paso actual)
  if (isDocsRequested) return "current-warning"
  if (isFinal) {
    if (isApproved) return "current-approved"
    if (isRejected) return "current-rejected"
  }
  return "current"
}

function StepCircle({
  state,
  index,
  isLast,
}: {
  state: StepState
  index: number
  isLast: boolean
}) {
  const styles: Record<StepState, { bg: string; text: string; ring: string }> = {
    done: { bg: "bg-[#1b38e8]", text: "text-white", ring: "" },
    current: { bg: "bg-[#1b38e8]", text: "text-white", ring: "ring-4 ring-blue-100" },
    "current-warning": { bg: "bg-amber-500", text: "text-white", ring: "ring-4 ring-amber-100" },
    "current-rejected": { bg: "bg-red-600", text: "text-white", ring: "ring-4 ring-red-100" },
    "current-approved": { bg: "bg-green-600", text: "text-white", ring: "ring-4 ring-green-100" },
    pending: { bg: "bg-white border-2 border-gray-300", text: "text-gray-400", ring: "" },
  }

  const s = styles[state]

  return (
    <div
      className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${s.bg} ${s.text} ${s.ring}`}
    >
      {state === "done" ? (
        <Check className="h-4 w-4" />
      ) : state === "current-approved" ? (
        <Check className="h-4 w-4" />
      ) : state === "current-rejected" ? (
        <X className="h-4 w-4" />
      ) : state === "current-warning" ? (
        <FileWarning className="h-4 w-4" />
      ) : (
        index
      )}
    </div>
  )
}

function StepLabel({ state, label }: { state: StepState; label: string }) {
  const colors: Record<StepState, string> = {
    done: "text-gray-900 font-medium",
    current: "text-[#1b38e8] font-semibold",
    "current-warning": "text-amber-700 font-semibold",
    "current-rejected": "text-red-700 font-semibold",
    "current-approved": "text-green-700 font-semibold",
    pending: "text-gray-400",
  }

  return (
    <span className={`text-xs sm:text-[11px] text-center ${colors[state]}`}>
      {label}
    </span>
  )
}
