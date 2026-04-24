"use client"

import { Check, X } from "lucide-react"
import {
  TIMELINE_STEPS,
  getStatusBucket,
  getTimelineIndex,
  type ApplicationStatus,
} from "@/lib/constants/roles"

type Props = {
  status: ApplicationStatus
}

/**
 * Timeline horizontal (desktop) / vertical (mobile) de 7 pasos.
 *
 * Colores según el paso y el estado global:
 *  - Paso completado: azul relleno con check
 *  - Paso actual normal: azul relleno
 *  - Paso actual en "docs_requested": amarillo (acción urgente del cliente)
 *  - Paso actual en aprobado: verde
 *  - Paso actual en rechazado/cancelado: rojo con X
 *  - Paso futuro: gris outline
 */
export function ApplicationTimeline({ status }: Props) {
  const bucket = getStatusBucket(status)
  const currentIndex = getTimelineIndex(bucket)
  const isApproved = bucket === "approved"
  const isFailed = bucket === "rejected" || bucket === "cancelled"
  const isDocsRequested = bucket === "docs_requested"

  return (
    <div>
      {/* Desktop: horizontal */}
      <ol className="hidden md:flex items-start justify-between relative">
        {TIMELINE_STEPS.map((step, i) => {
          const state = getStepState(i, currentIndex, isApproved, isFailed, isDocsRequested)
          const isLast = i === TIMELINE_STEPS.length - 1

          return (
            <li key={step.bucket} className="flex-1 flex flex-col items-center relative">
              {/* Línea conectora hacia el siguiente paso */}
              {!isLast && (
                <div
                  className={`absolute top-4 left-1/2 right-0 h-0.5 ${getConnectorColor(
                    i,
                    currentIndex,
                    isApproved,
                    isFailed
                  )}`}
                  style={{ width: "100%", zIndex: 0 }}
                  aria-hidden
                />
              )}

              {/* Círculo del paso */}
              <div
                className={`relative z-10 h-8 w-8 rounded-full grid place-items-center text-xs font-semibold ${getStepCircleClasses(
                  state
                )}`}
              >
                {state === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : state === "failed" ? (
                  <X className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>

              {/* Label */}
              <p
                className={`mt-2 text-[11px] text-center px-1 max-w-[90px] leading-tight ${getStepLabelClasses(
                  state
                )}`}
              >
                {step.shortLabel}
              </p>
            </li>
          )
        })}
      </ol>

      {/* Mobile: vertical */}
      <ol className="md:hidden space-y-3">
        {TIMELINE_STEPS.map((step, i) => {
          const state = getStepState(i, currentIndex, isApproved, isFailed, isDocsRequested)
          const isLast = i === TIMELINE_STEPS.length - 1

          return (
            <li key={step.bucket} className="flex items-start gap-3 relative">
              {/* Línea vertical conectora */}
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 bottom-0 w-0.5 ${getConnectorColor(
                    i,
                    currentIndex,
                    isApproved,
                    isFailed
                  )}`}
                  style={{ height: "calc(100% - 1rem)" }}
                  aria-hidden
                />
              )}

              {/* Círculo */}
              <div
                className={`relative z-10 h-8 w-8 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${getStepCircleClasses(
                  state
                )}`}
              >
                {state === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : state === "failed" ? (
                  <X className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>

              {/* Label con más detalle en mobile */}
              <div className="pt-1">
                <p className={`text-sm ${getStepLabelClasses(state)}`}>
                  {step.label}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

type StepState = "completed" | "current" | "current-warning" | "current-success" | "failed" | "future"

function getStepState(
  stepIndex: number,
  currentIndex: number,
  isApproved: boolean,
  isFailed: boolean,
  isDocsRequested: boolean
): StepState {
  if (stepIndex < currentIndex) return "completed"
  if (stepIndex > currentIndex) return "future"

  // stepIndex === currentIndex (paso actual)
  if (isApproved) return "current-success"
  if (isFailed) return "failed"
  if (isDocsRequested) return "current-warning"
  return "current"
}

function getStepCircleClasses(state: StepState): string {
  switch (state) {
    case "completed":
      return "bg-[#1b38e8] text-white"
    case "current":
      return "bg-[#1b38e8] text-white ring-4 ring-blue-100"
    case "current-warning":
      return "bg-amber-500 text-white ring-4 ring-amber-100"
    case "current-success":
      return "bg-green-600 text-white ring-4 ring-green-100"
    case "failed":
      return "bg-red-600 text-white ring-4 ring-red-100"
    case "future":
      return "bg-white border border-gray-300 text-gray-400"
  }
}

function getStepLabelClasses(state: StepState): string {
  switch (state) {
    case "completed":
      return "text-gray-700"
    case "current":
      return "text-[#1b38e8] font-semibold"
    case "current-warning":
      return "text-amber-700 font-semibold"
    case "current-success":
      return "text-green-700 font-semibold"
    case "failed":
      return "text-red-700 font-semibold"
    case "future":
      return "text-gray-400"
  }
}

function getConnectorColor(
  stepIndex: number,
  currentIndex: number,
  isApproved: boolean,
  isFailed: boolean
): string {
  // La línea entre step_i y step_i+1 está "completada" si currentIndex > i
  if (stepIndex < currentIndex) {
    if (isFailed) return "bg-red-300"
    if (isApproved) return "bg-green-300"
    return "bg-[#1b38e8]"
  }
  return "bg-gray-200"
}
