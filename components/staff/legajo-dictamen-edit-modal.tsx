"use client"

import { useState, useTransition, useEffect } from "react"
import { toast } from "sonner"
import { Lock, CheckCircle2, XCircle, MinusCircle, Loader2, X, Shield, Pencil } from "lucide-react"
import { editarDictamenAction } from "@/lib/actions/dictamen-edit"
import { DICTAMEN_DECISION_LABELS, type DictamenDecision } from "@/lib/constants/roles"

type ExistingDictamen = {
  id: string
  decision: DictamenDecision
  approved_amount: number | null
  term_months: number | null
  interest_rate: number | null
  conditions: string | null
  observations: string | null
  justification: string
}

type Props = {
  open: boolean
  onClose: () => void
  dictamen: ExistingDictamen
}

type Step = "auth" | "edit"

export function LegajoDictamenEditModal({ open, onClose, dictamen }: Props) {
  const [step, setStep] = useState<Step>("auth")
  const [currentPassword, setCurrentPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)

  // Campos editables (se inicializan con los valores actuales)
  const [decision, setDecision] = useState<DictamenDecision>(dictamen.decision)
  const [approvedAmount, setApprovedAmount] = useState(dictamen.approved_amount?.toString() ?? "")
  const [termMonths, setTermMonths] = useState(dictamen.term_months?.toString() ?? "")
  const [interestRate, setInterestRate] = useState(dictamen.interest_rate?.toString() ?? "")
  const [conditions, setConditions] = useState(dictamen.conditions ?? "")
  const [observations, setObservations] = useState(dictamen.observations ?? "")
  const [justification, setJustification] = useState(dictamen.justification)
  const [motivo, setMotivo] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, startSubmit] = useTransition()

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setStep("auth")
      setCurrentPassword("")
      setAuthError(null)
      setMotivo("")
      setErrors({})
      // Re-sync con el dictamen actual (por si se edita, se cierra y se vuelve a abrir)
      setDecision(dictamen.decision)
      setApprovedAmount(dictamen.approved_amount?.toString() ?? "")
      setTermMonths(dictamen.term_months?.toString() ?? "")
      setInterestRate(dictamen.interest_rate?.toString() ?? "")
      setConditions(dictamen.conditions ?? "")
      setObservations(dictamen.observations ?? "")
      setJustification(dictamen.justification)
    }
  }, [open, dictamen])

  if (!open) return null

  const handleAuth = () => {
    setAuthError(null)
    if (!currentPassword) {
      setAuthError("Ingresá tu contraseña")
      return
    }
    // No validamos la contraseña acá (eso lo hace el server), pero cambiamos de paso
    // asumiendo que la pondrá bien. Si se equivoca, el server la rechaza y vuelve al paso auth.
    setStep("edit")
  }

  const handleSubmit = () => {
    setErrors({})

    if (justification.trim().length < 20) {
      setErrors({ justification: "El fundamento tiene que tener al menos 20 caracteres" })
      toast.error("Completá el fundamento (mínimo 20 caracteres)")
      return
    }
    if (motivo.trim().length < 10) {
      setErrors({ motivo: "El motivo de la edición tiene que tener al menos 10 caracteres" })
      toast.error("Indicá el motivo de la edición (mínimo 10 caracteres)")
      return
    }
    if (decision === "approved") {
      const amount = parseFloat(approvedAmount.replace(/\./g, "").replace(",", "."))
      if (isNaN(amount) || amount <= 0) {
        setErrors({ approved_amount: "Ingresá el monto aprobado" })
        toast.error("Si aprobás, tenés que indicar el monto")
        return
      }
    }

    startSubmit(async () => {
      const parsedAmount = approvedAmount ? parseFloat(approvedAmount.replace(/\./g, "").replace(",", ".")) : null
      const parsedTerm = termMonths ? parseInt(termMonths, 10) : null
      const parsedRate = interestRate ? parseFloat(interestRate.replace(",", ".")) : null

      const res = await editarDictamenAction({
        dictamen_id: dictamen.id,
        current_password: currentPassword,
        motivo: motivo.trim(),
        decision,
        approved_amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : null,
        term_months: parsedTerm && !isNaN(parsedTerm) ? parsedTerm : null,
        interest_rate: parsedRate && !isNaN(parsedRate) ? parsedRate : null,
        conditions: conditions.trim() || null,
        observations: observations.trim() || null,
        justification: justification.trim(),
      })

      if (!res.ok) {
        // Si falla por contraseña, volver al paso auth
        if (res.fieldErrors?.current_password) {
          setAuthError(res.fieldErrors.current_password[0] ?? "Contraseña incorrecta")
          setStep("auth")
          setCurrentPassword("")
          toast.error("La contraseña es incorrecta")
          return
        }
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

      toast.success("Dictamen actualizado correctamente")
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-[#1b38e8]" />
            <h2 className="text-sm font-semibold text-gray-900">
              {step === "auth" ? "Confirmá tu identidad" : "Editar dictamen"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors" title="Cerrar"><X className="h-4 w-4" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "auth" ? (
            <AuthStep
              password={currentPassword}
              onPasswordChange={setCurrentPassword}
              error={authError}
              onSubmit={handleAuth}
            />
          ) : (
            <EditStep
              decision={decision}
              onDecisionChange={setDecision}
              approvedAmount={approvedAmount}
              onApprovedAmountChange={setApprovedAmount}
              termMonths={termMonths}
              onTermMonthsChange={setTermMonths}
              interestRate={interestRate}
              onInterestRateChange={setInterestRate}
              conditions={conditions}
              onConditionsChange={setConditions}
              observations={observations}
              onObservationsChange={setObservations}
              justification={justification}
              onJustificationChange={setJustification}
              motivo={motivo}
              onMotivoChange={setMotivo}
              errors={errors}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors">Cancelar</button>
          {step === "auth" ? (
            <button type="button" onClick={handleAuth} disabled={!currentPassword} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Shield className="h-3.5 w-3.5" />
              Continuar
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Guardando...</> : <><Pencil className="h-3.5 w-3.5" />Guardar cambios</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STEP 1 — Re-autenticación
// ============================================================

function AuthStep({
  password,
  onPasswordChange,
  error,
  onSubmit,
}: {
  password: string
  onPasswordChange: (v: string) => void
  error: string | null
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <p className="font-medium">Editar un dictamen firmado requiere confirmación</p>
          <p className="mt-0.5 text-amber-700">El cambio queda registrado con tu identidad y motivo en la auditoría.</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña actual</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSubmit() }}
            autoFocus
            className={`w-full text-sm text-gray-900 bg-white border rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] ${error ? "border-red-300" : "border-gray-200"}`}
            placeholder="Tu contraseña"
          />
        </div>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}

// ============================================================
// STEP 2 — Formulario de edición
// ============================================================

function EditStep({
  decision,
  onDecisionChange,
  approvedAmount,
  onApprovedAmountChange,
  termMonths,
  onTermMonthsChange,
  interestRate,
  onInterestRateChange,
  conditions,
  onConditionsChange,
  observations,
  onObservationsChange,
  justification,
  onJustificationChange,
  motivo,
  onMotivoChange,
  errors,
}: {
  decision: DictamenDecision
  onDecisionChange: (v: DictamenDecision) => void
  approvedAmount: string
  onApprovedAmountChange: (v: string) => void
  termMonths: string
  onTermMonthsChange: (v: string) => void
  interestRate: string
  onInterestRateChange: (v: string) => void
  conditions: string
  onConditionsChange: (v: string) => void
  observations: string
  onObservationsChange: (v: string) => void
  justification: string
  onJustificationChange: (v: string) => void
  motivo: string
  onMotivoChange: (v: string) => void
  errors: Record<string, string>
}) {
  return (
    <div className="space-y-4">
      {/* Decisión */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Decisión</label>
        <div className="grid grid-cols-3 gap-2">
          <DecisionChip label="Aprobar" icon={<CheckCircle2 className="h-3.5 w-3.5" />} selected={decision === "approved"} onSelect={() => onDecisionChange("approved")} colorClass="emerald" />
          <DecisionChip label="Observar" icon={<MinusCircle className="h-3.5 w-3.5" />} selected={decision === "observed"} onSelect={() => onDecisionChange("observed")} colorClass="amber" />
          <DecisionChip label="Rechazar" icon={<XCircle className="h-3.5 w-3.5" />} selected={decision === "rejected"} onSelect={() => onDecisionChange("rejected")} colorClass="red" />
        </div>
      </div>

      {/* Campos condicionales */}
      {decision === "approved" ? (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <NumberField label="Monto aprobado (ARS)" value={approvedAmount} onChange={onApprovedAmountChange} error={errors.approved_amount} required />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Plazo (meses)" value={termMonths} onChange={onTermMonthsChange} />
            <NumberField label="Tasa (% anual)" value={interestRate} onChange={onInterestRateChange} />
          </div>
          <TextAreaField label="Condiciones" value={conditions} onChange={onConditionsChange} hint="Opcional" rows={2} />
        </div>
      ) : null}

      {decision === "observed" ? (
        <div className="pt-3 border-t border-gray-100">
          <TextAreaField label="Observaciones" value={observations} onChange={onObservationsChange} hint="Qué aclaraciones faltan" rows={2} />
        </div>
      ) : null}

      {/* Fundamento */}
      <div className="pt-3 border-t border-gray-100">
        <TextAreaField label="Fundamento del dictamen" value={justification} onChange={onJustificationChange} error={errors.justification} required rows={3} />
        <p className="mt-1 text-[10px] text-gray-400">{justification.trim().length} / 20 caracteres mínimos</p>
      </div>

      {/* Motivo de la edición */}
      <div className="pt-3 border-t border-gray-100">
        <TextAreaField label="Motivo de esta edición" value={motivo} onChange={onMotivoChange} error={errors.motivo} required hint="Queda registrado en la auditoría" placeholder="Ej: ajuste de monto por revisión de garantías" rows={2} />
        <p className="mt-1 text-[10px] text-gray-400">{motivo.trim().length} / 10 caracteres mínimos</p>
      </div>
    </div>
  )
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function DecisionChip({ label, icon, selected, onSelect, colorClass }: { label: string; icon: React.ReactNode; selected: boolean; onSelect: () => void; colorClass: "emerald" | "amber" | "red" }) {
  const colors = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" },
    red: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
  }[colorClass]

  return (
    <button type="button" onClick={onSelect} className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md border text-xs font-medium transition-all ${selected ? `${colors.bg} ${colors.border} ${colors.text}` : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}>
      {icon}
      {label}
    </button>
  )
}

function NumberField({ label, value, onChange, error, required, placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </label>
      <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full text-sm font-mono text-gray-900 bg-white border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] ${error ? "border-red-300" : "border-gray-200"}`} />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

function TextAreaField({ label, value, onChange, placeholder, hint, error, required, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; error?: string; required?: boolean; rows?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-700">
          {label}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </label>
        {hint && !error ? <span className="text-[10px] text-gray-400">{hint}</span> : null}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`w-full text-sm text-gray-900 bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] resize-none ${error ? "border-red-300" : "border-gray-200"}`} />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
