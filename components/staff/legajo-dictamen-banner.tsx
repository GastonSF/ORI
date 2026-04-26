"use client"

import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowDown,
  Megaphone,
} from "lucide-react"
import {
  DICTAMEN_DECISION_LABELS,
  type DictamenDecision,
} from "@/lib/constants/roles"

type Props = {
  dictamen: {
    decision: DictamenDecision
    approved_amount: number | null
    term_months: number | null
    interest_rate: number | null
    created_at: string
  }
  analystName: string | null
}

/**
 * Banner contextual que aparece arriba del legajo cuando hay dictamen.
 * Solo se muestra para el oficial: el analista ya cargó el dictamen
 * y no necesita destacarlo.
 *
 * Sirve para que cuando el oficial entra al legajo después del dictamen,
 * vea inmediatamente la decisión sin tener que scrollear hasta abajo.
 *
 * Color y mensaje cambian según la decisión:
 *   - approved: verde, "El comité aprobó este crédito"
 *   - rejected: rojo, "El comité rechazó este crédito"
 *   - observed: amber, "El comité observó el legajo"
 *
 * Tiene un link "Ver dictamen completo" que hace scroll suave hasta
 * la card del dictamen en la columna derecha.
 */
export function LegajoDictamenBanner({ dictamen, analystName }: Props) {
  const meta = getDecisionMeta(dictamen.decision)
  const Icon = meta.Icon

  const handleScrollToDictamen = (e: React.MouseEvent) => {
    e.preventDefault()
    const el = document.getElementById("dictamen-card")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  return (
    <section
      className={`rounded-xl border ${meta.borderClass} ${meta.bgClass} p-5`}
    >
      <div className="flex items-start gap-4">
        {/* Icono grande */}
        <div
          className={`h-12 w-12 rounded-full ${meta.iconBgClass} grid place-items-center shrink-0`}
        >
          <Icon className={`h-6 w-6 ${meta.iconColorClass}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`text-base font-semibold ${meta.titleColorClass}`}>
              {meta.title}
            </h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.pillClass}`}
            >
              {DICTAMEN_DECISION_LABELS[dictamen.decision]}
            </span>
          </div>

          {/* Detalles según el tipo de decisión */}
          {dictamen.decision === "approved" && (
            <div className="mt-1.5 flex items-center gap-3 flex-wrap text-sm">
              {dictamen.approved_amount != null && (
                <span className={meta.detailColorClass}>
                  <span className="text-xs opacity-70">Monto:</span>{" "}
                  <strong className="font-mono">
                    {formatARS(Number(dictamen.approved_amount))}
                  </strong>
                </span>
              )}
              {dictamen.term_months != null && (
                <>
                  <span className={`${meta.detailColorClass} opacity-40`}>·</span>
                  <span className={meta.detailColorClass}>
                    <span className="text-xs opacity-70">Plazo:</span>{" "}
                    <strong>{dictamen.term_months} meses</strong>
                  </span>
                </>
              )}
              {dictamen.interest_rate != null && (
                <>
                  <span className={`${meta.detailColorClass} opacity-40`}>·</span>
                  <span className={meta.detailColorClass}>
                    <span className="text-xs opacity-70">Tasa:</span>{" "}
                    <strong>{Number(dictamen.interest_rate).toFixed(2)}% anual</strong>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Mensaje y CTA */}
          <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
            <Megaphone className={`h-3.5 w-3.5 ${meta.detailColorClass} opacity-60 shrink-0`} />
            <span className={meta.detailColorClass}>{meta.actionText}</span>
            <button
              type="button"
              onClick={handleScrollToDictamen}
              className={`inline-flex items-center gap-1 ${meta.linkColorClass} font-medium hover:underline`}
            >
              {meta.linkText}
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>

          {/* Footer con info del analista */}
          {analystName && (
            <p className={`mt-2 text-xs ${meta.detailColorClass} opacity-70`}>
              Cargado por {analystName} ·{" "}
              {new Date(dictamen.created_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Meta por decisión: colores y textos
// ============================================================
function getDecisionMeta(decision: DictamenDecision) {
  switch (decision) {
    case "approved":
      return {
        Icon: CheckCircle2,
        title: "El comité de riesgo aprobó este crédito",
        actionText: "Comunicale al cliente.",
        linkText: "Ver dictamen completo",
        bgClass: "bg-emerald-50",
        borderClass: "border-emerald-200",
        iconBgClass: "bg-white",
        iconColorClass: "text-emerald-600",
        titleColorClass: "text-emerald-900",
        detailColorClass: "text-emerald-800",
        linkColorClass: "text-emerald-700",
        pillClass: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      }
    case "rejected":
      return {
        Icon: XCircle,
        title: "El comité de riesgo rechazó este crédito",
        actionText: "Comunicale la decisión al cliente.",
        linkText: "Ver fundamentos",
        bgClass: "bg-red-50",
        borderClass: "border-red-200",
        iconBgClass: "bg-white",
        iconColorClass: "text-red-600",
        titleColorClass: "text-red-900",
        detailColorClass: "text-red-800",
        linkColorClass: "text-red-700",
        pillClass: "bg-red-100 text-red-800 border border-red-200",
      }
    case "observed":
      return {
        Icon: MinusCircle,
        title: "El comité de riesgo observó el legajo",
        actionText: "Necesita aclaraciones del cliente.",
        linkText: "Ver observaciones",
        bgClass: "bg-amber-50",
        borderClass: "border-amber-200",
        iconBgClass: "bg-white",
        iconColorClass: "text-amber-600",
        titleColorClass: "text-amber-900",
        detailColorClass: "text-amber-800",
        linkColorClass: "text-amber-700",
        pillClass: "bg-amber-100 text-amber-800 border border-amber-200",
      }
  }
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}
