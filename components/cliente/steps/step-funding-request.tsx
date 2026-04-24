"use client"

import { useState, useTransition } from "react"
import { Loader2, DollarSign, Building2, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import type { Client } from "@/types/database.types"
import { FUNDING_LINES, FUNDING_LINE_LABELS } from "@/lib/constants/roles"
import type { FundingLine } from "@/lib/constants/roles"
import { saveFundingRequestAction } from "@/lib/actions/client"

type LineInfo = {
  shortDesc: string
  forWhom: string
  docsPreview: string[]
  icon: React.ReactNode
}

type LineInfoMap = {
  fgplus: LineInfo
  financing_general: LineInfo
}

const LINE_INFO: LineInfoMap = {
  fgplus: {
    shortDesc: "FGPlus",
    forWhom: "Para entidades financieras que prestan a sus socios o clientes.",
    docsPreview: [
      "Composición de cartera",
      "Política de originación",
      "Política de cobranza",
    ],
    icon: <Building2 className="h-5 w-5" />,
  },
  financing_general: {
    shortDesc: "Financiamiento General",
    forWhom: "Para PyMEs con necesidad de capital de trabajo o inversión.",
    docsPreview: [
      "Plan de negocios",
      "Flujo de ventas proyectado",
      "Aval personal si aplica",
    ],
    icon: <TrendingUp className="h-5 w-5" />,
  },
}

type Props = {
  client: Client | null
  existingAmount: number | null
  existingLine: FundingLine | null
  onDone: () => void
}

export function StepFundingRequest({
  client,
  existingAmount,
  existingLine,
  onDone,
}: Props) {
  const [amount, setAmount] = useState<string>(
    existingAmount != null ? String(existingAmount) : ""
  )
  const [line, setLine] = useState<FundingLine | null>(existingLine)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, "")
    setAmount(cleaned)
    setErrors((e) => ({ ...e, amount: "" }))
  }

  const formatDisplay = (val: string): string => {
    if (!val) return ""
    const n = parseInt(val, 10)
    if (isNaN(n)) return ""
    return new Intl.NumberFormat("es-AR").format(n)
  }

  const handleSubmit = () => {
    setErrors({})
    const newErrors: Record<string, string> = {}

    const numericAmount = parseInt(amount, 10)
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = "Ingresá un monto válido"
    } else if (numericAmount < 100_000) {
      newErrors.amount = "El monto mínimo es $ 100.000"
    } else if (numericAmount > 10_000_000_000) {
      newErrors.amount = "El monto es demasiado alto"
    }

    if (!line) {
      newErrors.line = "Elegí el tipo de línea"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Completá los campos obligatorios")
      return
    }

    startTransition(async () => {
      const res = await saveFundingRequestAction({
        requested_amount: numericAmount,
        funding_line: line!,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      onDone()
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <p className="text-sm text-gray-600">
        Cuánto solicitás y qué tipo de línea te conviene. Podés cambiarlo antes de enviar.
      </p>

      {/* ============== MONTO ============== */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-900 mb-1">
          ¿Cuánto solicitás? <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          El monto final puede ajustarse tras el análisis.
        </p>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <DollarSign className="h-4 w-4" />
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={formatDisplay(amount)}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={isPending}
            placeholder="Ej: 50.000.000"
            className={`block w-full rounded-md border pl-9 pr-14 py-2.5 text-sm font-mono text-gray-900 focus:outline-none focus:ring-1 ${
              errors.amount
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-[#1b38e8] focus:ring-[#1b38e8]"
            }`}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-xs text-gray-400 font-medium">ARS</span>
          </div>
        </div>
        {errors.amount ? (
          <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
        ) : null}
      </div>

      {/* ============== LÍNEA ============== */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-900 mb-1">
          ¿Qué tipo de línea? <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">
          La línea define qué documentación extra te vamos a pedir.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FUNDING_LINES.map((l) => {
            const info = LINE_INFO[l]
            const isSelected = line === l
            return (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLine(l)
                  setErrors((e) => ({ ...e, line: "" }))
                }}
                disabled={isPending}
                aria-pressed={isSelected}
                className={`text-left p-4 rounded-lg border transition ${
                  isSelected
                    ? "border-[#1b38e8] bg-[#eff3ff] ring-1 ring-[#1b38e8]"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-white text-[#1b38e8]" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-sm ${
                        isSelected ? "text-[#1b38e8]" : "text-gray-900"
                      }`}
                    >
                      {FUNDING_LINE_LABELS[l]}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {info.forWhom}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">
                    Te vamos a pedir
                  </p>
                  <ul className="space-y-0.5">
                    {info.docsPreview.map((doc) => (
                      <li
                        key={doc}
                        className="text-xs text-gray-600 flex items-start gap-1.5"
                      >
                        <span className="text-gray-400 shrink-0">·</span>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            )
          })}
        </div>

        {errors.line ? (
          <p className="mt-2 text-xs text-red-600">{errors.line}</p>
        ) : null}
      </div>

      {/* ============== SUBMIT ============== */}
      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={isPending || !amount || !line}
          className="inline-flex items-center gap-2 rounded-md bg-[#1b38e8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Siguiente"
          )}
        </button>
      </div>
    </form>
  )
}
