"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { UserCheck, UserPlus, UserMinus, Loader2, AlertCircle } from "lucide-react"
import { takeLegajoAction, releaseLegajoAction } from "@/lib/actions/assign-legajo"

type Props = {
  applicationId: string
  applicationNumber: string
  assignedOfficerId: string | null
  assignedOfficerName: string | null
  currentUserId: string
  currentUserRole: "officer" | "admin" | "analyst"
}

/**
 * Botón de asignación de legajos para oficiales.
 *
 * Muestra el estado de asignación + botón de acción según la situación:
 *  - Sin asignar → [Tomar este legajo]
 *  - Asignado a vos → "Asignado a vos" + [Soltar]
 *  - Asignado a otro → "Con Carlos" + [Pasar a mí] (con confirmación)
 *
 * Solo oficiales y admins pueden tomar/soltar. Para analistas es read-only.
 */
export function LegajoAssignmentButton({
  applicationId,
  applicationNumber,
  assignedOfficerId,
  assignedOfficerName,
  currentUserId,
  currentUserRole,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [showConfirmSteal, setShowConfirmSteal] = useState(false)

  const isUnassigned = !assignedOfficerId
  const isMine = assignedOfficerId === currentUserId
  const isOther = !!assignedOfficerId && !isMine
  const canAct = currentUserRole === "officer" || currentUserRole === "admin"

  // Para analistas: solo mostramos el estado, sin botones
  if (!canAct) {
    if (isUnassigned) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <AlertCircle className="h-3.5 w-3.5" />
          Sin asignar
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
        <UserCheck className="h-3.5 w-3.5" />
        Asignado a {isMine ? "vos" : assignedOfficerName ?? "un oficial"}
      </span>
    )
  }

  const handleTake = () => {
    startTransition(async () => {
      const res = await takeLegajoAction({ application_id: applicationId })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`Tomaste ${applicationNumber}`)
      setShowConfirmSteal(false)
    })
  }

  const handleRelease = () => {
    startTransition(async () => {
      const res = await releaseLegajoAction({ application_id: applicationId })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`Soltaste ${applicationNumber}`)
    })
  }

  // ======================================================
  // Caso 1: Sin asignar → botón simple "Tomar"
  // ======================================================
  if (isUnassigned) {
    return (
      <button
        type="button"
        onClick={handleTake}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1b38e8] text-white text-xs font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
        Tomar este legajo
      </button>
    )
  }

  // ======================================================
  // Caso 2: Asignado a vos → chip verde + botón Soltar
  // ======================================================
  if (isMine) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
          <UserCheck className="h-3.5 w-3.5" />
          Asignado a vos
        </span>
        <button
          type="button"
          onClick={handleRelease}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserMinus className="h-3.5 w-3.5" />
          )}
          Soltar
        </button>
      </div>
    )
  }

  // ======================================================
  // Caso 3: Asignado a otro → chip gris + botón "Pasar a mí"
  // ======================================================
  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200">
        <UserCheck className="h-3.5 w-3.5" />
        Con {assignedOfficerName ?? "otro oficial"}
      </span>
      {!showConfirmSteal ? (
        <button
          type="button"
          onClick={() => setShowConfirmSteal(true)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Pasar a mí
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
          <span className="text-xs text-amber-800">¿Seguro?</span>
          <button
            type="button"
            onClick={handleTake}
            disabled={isPending}
            className="text-xs font-semibold text-[#1b38e8] hover:underline disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin inline" />
            ) : (
              "Sí, pasar a mí"
            )}
          </button>
          <span className="text-amber-300">·</span>
          <button
            type="button"
            onClick={() => setShowConfirmSteal(false)}
            disabled={isPending}
            className="text-xs text-gray-600 hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
