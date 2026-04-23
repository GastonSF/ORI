"use client"

import { useState, useTransition } from "react"
import { User, FileText, Users, Building2, Handshake, HeartHandshake, Loader2 } from "lucide-react"
import type { Client } from "@/types/database.types"
import { CLIENT_TYPES, CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants/roles"
import { setClientTypeAction } from "@/lib/actions/client"

const ICONS: Record<ClientType, React.ReactNode> = {
  monotributo: <User className="h-5 w-5" />,
  responsable_inscripto: <FileText className="h-5 w-5" />,
  srl: <Users className="h-5 w-5" />,
  sa: <Building2 className="h-5 w-5" />,
  cooperativa: <Handshake className="h-5 w-5" />,
  mutual: <HeartHandshake className="h-5 w-5" />,
}

const DESCRIPTIONS: Record<ClientType, string> = {
  monotributo: "Persona con régimen simplificado",
  responsable_inscripto: "Persona o empresa inscripta en IVA",
  srl: "Sociedad de Responsabilidad Limitada",
  sa: "Sociedad Anónima",
  cooperativa: "Organización sin fines de lucro de socios",
  mutual: "Asociación mutual de ayuda entre socios",
}

const HINTS: Record<ClientType, string> = {
  monotributo: "DNI del titular, constancia AFIP, DDJJ de ganancias y extracto bancario.",
  responsable_inscripto: "DNI, constancia AFIP, estados contables y DDJJ de los últimos 2 años.",
  srl: "Estatuto social, actas, balances de los últimos 3 años y nómina de socios.",
  sa: "Estatuto social, actas del directorio, balances y estados contables auditados.",
  cooperativa: "Estatuto, acta constitutiva, estados contables y libro de asociados.",
  mutual: "Estatuto social, acta constitutiva, estados contables y padrón de asociados.",
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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleContinue()
      }}
    >
      <p className="text-sm text-gray-600">
        Esto determina qué documentación vas a necesitar cargar.
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CLIENT_TYPES.map((type) => {
          const isSelected = selected === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelected(type)}
              className={`p-4 rounded-lg border text-left transition ${
                isSelected
                  ? "border-[#1b38e8] bg-[#eff3ff] ring-1 ring-[#1b38e8]"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-white text-[#1b38e8]" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ICONS[type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm ${
                      isSelected ? "text-[#1b38e8]" : "text-gray-900"
                    }`}
                  >
                    {CLIENT_TYPE_LABELS[type]}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{DESCRIPTIONS[type]}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="mt-5 rounded-lg border border-blue-100 bg-[#eff3ff]/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#1b38e8] mb-1">
            Qué vamos a pedirte
          </p>
          <p className="text-sm text-gray-700">{HINTS[selected]}</p>
        </div>
      ) : null}

      {serverError ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={!selected || pending}
          className="inline-flex items-center gap-2 rounded-md bg-[#1b38e8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? (
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
