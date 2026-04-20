"use client"

import { useState, useTransition } from "react"
import { User, FileText, Users, Building2, Handshake, Landmark, Loader2 } from "lucide-react"
import type { Client } from "@/types/database.types"
import { CLIENT_TYPES, CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants/roles"
import { setClientTypeAction } from "@/lib/actions/client"

const ICONS: Record<ClientType, React.ReactNode> = {
  monotributo: <User className="h-5 w-5" />,
  responsable_inscripto: <FileText className="h-5 w-5" />,
  srl: <Users className="h-5 w-5" />,
  sa: <Building2 className="h-5 w-5" />,
  cooperativa: <Handshake className="h-5 w-5" />,
  entidad_financiera: <Landmark className="h-5 w-5" />,
}

const HINTS: Record<ClientType, string> = {
  monotributo: "DNI del titular, constancia AFIP, DDJJ de ganancias y extracto bancario.",
  responsable_inscripto: "DNI, constancia AFIP, estados contables y DDJJ de los últimos 2 años.",
  srl: "Las SRL requieren estatuto social, actas y balances de los últimos 3 años.",
  sa: "Las SA requieren estatuto social, actas, balances y estados contables.",
  cooperativa: "Cooperativas: estatuto, actas, estado contable y extracto bancario.",
  entidad_financiera: "Balance, estados contables de los últimos 2 años y estatuto social.",
}

type Props = { client: Client | null; onDone: () => void }

export function StepClientType({ client, onDone }: Props) {
  const [selected, setSelected] = useState<ClientType | null>(
    (client?.client_type as ClientType) ?? null
  )
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const handleContinue = () => {
    if (!selected) return
    setServerError(null)
    startTransition(async () => {
      const result = await setClientTypeAction({ client_type: selected })
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      onDone()
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Seleccioná el tipo de cliente</h2>
      <p className="mt-1 text-sm text-gray-600">
        Esto determina qué documentación vas a necesitar cargar.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {CLIENT_TYPES.map((type) => {
          const isSelected = selected === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelected(type)}
              className={`p-4 rounded-lg border text-left transition ${
                isSelected
                  ? "border-[#1b38e8] bg-blue-50/50 ring-2 ring-[#1b38e8]/20"
                  : "border-gray-200 hover:border-gray-400"
              }`}
              aria-pressed={isSelected}
            >
              <div className={`mb-3 ${isSelected ? "text-[#1b38e8]" : "text-gray-500"}`}>
                {ICONS[type]}
              </div>
              <div className="font-semibold text-gray-900 text-sm">
                {CLIENT_TYPE_LABELS[type]}
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="mt-6 rounded-md border border-blue-100 bg-blue-50/50 p-4 text-sm text-gray-700">
          <strong className="text-[#1b38e8]">Requisitos:</strong> {HINTS[selected]}
        </div>
      )}

      {serverError && (
        <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!selected || pending}
          onClick={handleContinue}
          className="rounded-md bg-[#1b38e8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
            </span>
          ) : (
            "Siguiente"
          )}
        </button>
      </div>
    </div>
  )
}
