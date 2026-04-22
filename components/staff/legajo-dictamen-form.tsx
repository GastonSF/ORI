"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  Gavel,
  Clock,
  Pencil,
} from "lucide-react"
import { emitirDictamenAction } from "@/lib/actions/dictamen"
import {
  DICTAMEN_DECISION_LABELS,
  type DictamenDecision,
  type ApplicationStatus,
} from "@/lib/constants/roles"

type ExistingDictamen = {
  id: string
  decision: DictamenDecision
  approved_amount: number | null
  term_months: number | null
  interest_rate: number | null
  conditions: string | null
  observations: string | null
  justification: string
  analyst_id: string
  created_at: string
  edit_count: number
  last_edited_at: string | null
  last_edited_by: string | null
}

type Props = {
  applicationId: string
  existingDictamen: ExistingDictamen | null
  applicationStatus: ApplicationStatus
}

export function LegajoDictamenForm({
  applicationId,
  existingDictamen,
  applicationStatus,
}: Props) {
  // Si ya hay dictamen emitido, mostramos la vista read-only
  if (existingDictamen) {
    return <DictamenEmitidoView dictamen={existingDictamen} />
  }

  // Si el legajo no está en estado dictaminable, mostramos aviso
  const dictaminable =
    applicationStatus === "in_risk_analysis" ||
    applicationStatus === "observed"

  if (!dictaminable) {
    return (
      <aside className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-2 text-gray-500">
          <Gavel className="h-4 w-4" />
          <h2 className="text-xs font-medium uppercase tracking-wide">
            Dictamen
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          Este legajo no está en una fase dictaminable. El analista solo puede
          emitir dictamen cuando el legajo está en análisis crediticio u
          observado.
        </p>
      </aside>
    )
  }

  return <DictamenForm applicationId={applicationId} />
}

// ============================================================
// FORMULARIO DE EMISIÓN
// ============================================================

function DictamenForm({ applicationId }: { applicationId: string }) {
  const [decision, setDecision] = useState<DictamenDecision | null>(null)
  const [approvedAmount, setApprovedAmount] = useState("")
  const [termMonths, setTermMonths] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [conditions, setConditions] = useState("")
  const [observations, setObservations] = useState("")
  const [justification, setJustification] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, startSubmit] = useTransition()

  const onSubmit = () => {
    setErrors({})

    if (!decision) {
      setErrors({ decision: "Seleccioná una decisión" })
      toast.error("Seleccioná una decisión")
      return
    }

    if (justification.trim().length < 20) {
      setErrors({
        justification: "El fundamento tiene que tener al menos 20 caracteres",
      })
      toast.error("Completá el fundamento (mínimo 20 caracteres)")
      return
    }

    if (decision === "approved") {
      const amount = parseFloat(approvedAmount.replace(/\./g, "").replace(",", "."))
      if (isNaN(amount) || amount <= 0) {
        setErrors({
          approved_amount: "Ingresá el monto aprobado",
        })
        toast.error("Si aprobás, tenés que indicar el monto")
        return
      }
    }

    startSubmit(async () => {
      const parsedAmount = approvedAmount
        ? parseFloat(approvedAmount.replace(/\./g, "").replace(",", "."))
        : null
      const parsedTerm = termMonths ? parseInt(termMonths, 10) : null
      const parsedRate = interestRate
        ? parseFloat(interestRate.replace(",", "."))
        : null

      const res = await emitirDictamenAction({
        application_id: applicationId,
        decision,
        approved_amount:
          parsedAmount && !isNaN(parsedAmount) ? parsedAmount : null,
        term_months: parsedTerm && !isNaN(parsedTerm) ? parsedTerm : null,
        interest_rate: parsedRate && !isNaN(parsedRate) ? parsedRate : null,
        conditions: conditions.trim() || null,
        observations: observations.trim() || null,
        justification: justification.trim(),
      })

      if (!res.ok) {
        if (res.fieldErrors) {
          const flat: Record<string, string> = {}
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            if (v && v.length) flat[k] = v[0]
          }
          setErrors(flat)
        }
        toast.error(res.error)
        return
      }

      toast.success("Dictamen emitido correctamente")
    })
  }

  return (
    <aside className="rounded-xl border border-gray-200 bg-white overflow-hidden sticky top-20">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <Gavel className="h-4 w-4 text-[#1b38e8]" />
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Emitir dictamen
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Decisión */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Decisión
          </label>
          <div className="grid grid-cols-1 gap-2">
            <DecisionOption
              decision="approved"
              label="Aprobar"
              description="El crédito cumple con los criterios"
              icon={<CheckCircle2 className="h-4 w-4" />}
              selected={decision === "approved"}
              onSelect={() => setDecision("approved")}
              colorClass="emerald"
            />
            <DecisionOption
              decision="observed"
              label="Observar"
              description="Pedir aclaraciones antes de decidir"
              icon={<MinusCircle className="h-4 w-4" />}
              selected={decision === "observed"}
              onSelect={() => setDecision("observed")}
              colorClass="amber"
            />
            <DecisionOption
              decision="rejected"
              label="Rechazar"
              description="No cumple con los criterios"
              icon={<XCircle className="h-4 w-4" />}
              selected={decision === "rejected"}
              onSelect={() => setDecision("rejected")}
              colorClass="red"
            />
          </div>
          {errors.decision && (
            <p className="mt-1 text-xs text-red-600">{errors.decision}</p>
          )}
        </div>

        {/* Campos de aprobación (solo si approved) */}
        {decision === "approved" && (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <NumberField
              label="Monto aprobado (ARS)"
              value={approvedAmount}
              onChange={setApprovedAmount}
              placeholder="Ej: 12000000"
              error={errors.approved_amount}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Plazo (meses)"
                value={termMonths}
                onChange={setTermMonths}
                placeholder="Ej: 24"
              />
              <NumberField
                label="Tasa (% anual)"
                value={interestRate}
                onChange={setInterestRate}
                placeholder="Ej: 65.5"
              />
            </div>
            <TextAreaField
              label="Condiciones"
              value={conditions}
              onChange={setConditions}
              placeholder="Ej: garantía real, co-deudor, etc."
              hint="Opcional"
            />
          </div>
        )}

        {/* Observaciones (solo si observed) */}
        {decision === "observed" && (
          <div className="pt-3 border-t border-gray-100">
            <TextAreaField
              label="Observaciones"
              value={observations}
              onChange={setObservations}
              placeholder="Qué aclaraciones o documentación falta"
              hint="El oficial verá estas observaciones"
            />
          </div>
        )}

        {/* Fundamento (siempre obligatorio) */}
        <div className="pt-3 border-t border-gray-100">
          <TextAreaField
            label="Fundamento del dictamen"
            value={justification}
            onChange={setJustification}
            placeholder="Explicá por qué tomás esta decisión. Mínimo 20 caracteres."
            error={errors.justification}
            required
            rows={4}
          />
          <p className="mt-1 text-[10px] text-gray-400">
            {justification.trim().length} / 20 caracteres mínimos
          </p>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !decision}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#1b38e8] text-white text-sm font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Emitiendo...
            </>
          ) : (
            <>
              <Gavel className="h-4 w-4" />
              Emitir dictamen
            </>
          )}
        </button>
        <p className="text-[10px] text-gray-400 text-center">
          Una vez emitido, el dictamen queda firmado con tu identidad.
        </p>
      </div>
    </aside>
  )
}

// ============================================================
// VISTA READ-ONLY DE UN DICTAMEN YA EMITIDO
// ============================================================

function DictamenEmitidoView({ dictamen }: { dictamen: ExistingDictamen }) {
  const meta = getDecisionMeta(dictamen.decision)
  const Icon = meta.Icon

  return (
    <aside className="rounded-xl border border-gray-200 bg-white overflow-hidden sticky top-20">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <Gavel className="h-4 w-4 text-[#1b38e8]" />
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Dictamen emitido
        </h2>
      </div>

      {/* Decisión destacada */}
      <div className={`p-4 ${meta.bg} border-b ${meta.border}`}>
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${meta.text}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${meta.text}`}>
              {DICTAMEN_DECISION_LABELS[dictamen.decision]}
            </p>
            <p className="text-[11px] text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Emitido{" "}
              {new Date(dictamen.created_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Detalle */}
      <dl className="p-4 space-y-3">
        {dictamen.decision === "approved" && (
          <>
            {dictamen.approved_amount != null && (
              <ReadField
                label="Monto aprobado"
                value={formatARS(Number(dictamen.approved_amount))}
                mono
              />
            )}
            {dictamen.term_months != null && (
              <ReadField
                label="Plazo"
                value={`${dictamen.term_months} meses`}
              />
            )}
            {dictamen.interest_rate != null && (
              <ReadField
                label="Tasa anual"
                value={`${Number(dictamen.interest_rate).toFixed(2)}%`}
                mono
              />
            )}
            {dictamen.conditions && (
              <ReadField label="Condiciones" value={dictamen.conditions} block />
            )}
          </>
        )}

        {dictamen.decision === "observed" && dictamen.observations && (
          <ReadField
            label="Observaciones"
            value={dictamen.observations}
            block
          />
        )}

        <ReadField
          label="Fundamento"
          value={dictamen.justification}
          block
        />
      </dl>

      {/* Auditoría */}
      {dictamen.edit_count > 0 && dictamen.last_edited_at && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Pencil className="h-3 w-3" />
            <span>
              Editado {dictamen.edit_count}{" "}
              {dictamen.edit_count === 1 ? "vez" : "veces"} ·{" "}
              {new Date(dictamen.last_edited_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function DecisionOption({
  label,
  description,
  icon,
  selected,
  onSelect,
  colorClass,
}: {
  decision: DictamenDecision
  label: string
  description: string
  icon: React.ReactNode
  selected: boolean
  onSelect: () => void
  colorClass: "emerald" | "amber" | "red"
}) {
  const colors = {
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      text: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-700",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-300",
      text: "text-red-700",
    },
  }[colorClass]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-2.5 p-2.5 rounded-md border text-left transition-all ${
        selected
          ? `${colors.bg} ${colors.border} ${colors.text}`
          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className={`mt-0.5 ${selected ? colors.text : "text-gray-400"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p
          className={`text-[11px] mt-0.5 ${
            selected ? "opacity-80" : "text-gray-500"
          }`}
        >
          {description}
        </p>
      </div>
    </button>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full text-sm font-mono text-gray-900 bg-white border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] ${
          error ? "border-red-300" : "border-gray-200"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  rows?: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && !error && (
          <span className="text-[10px] text-gray-400">{hint}</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full text-sm text-gray-900 bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] resize-none ${
          error ? "border-red-300" : "border-gray-200"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function ReadField({
  label,
  value,
  mono,
  block,
}: {
  label: string
  value: string
  mono?: boolean
  block?: boolean
}) {
  if (block) {
    return (
      <div>
        <dt className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </dt>
        <dd
          className={`text-xs text-gray-900 whitespace-pre-wrap ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </dd>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[11px] text-gray-500 shrink-0">{label}</dt>
      <dd
        className={`text-xs text-gray-900 text-right ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

function getDecisionMeta(decision: DictamenDecision) {
  switch (decision) {
    case "approved":
      return {
        Icon: CheckCircle2,
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      }
    case "rejected":
      return {
        Icon: XCircle,
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      }
    case "observed":
      return {
        Icon: MinusCircle,
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
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
