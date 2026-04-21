"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { Client, CompanyMember } from "@/types/database.types"
import {
  CLIENT_TYPE_LABELS,
  REQUIRED_DOCS_BY_CLIENT_TYPE,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/constants/roles"
import { completeOnboardingAction } from "@/lib/actions/client"

type Props = {
  client: Client
  members: CompanyMember[]
  uploadedDocTypes?: DocumentType[]
}

export function StepReview({ client, members, uploadedDocTypes = [] }: Props) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const requiredDocs = REQUIRED_DOCS_BY_CLIENT_TYPE[client.client_type]
  const completedCount = requiredDocs.filter((t) =>
    uploadedDocTypes.includes(t as DocumentType)
  ).length

  const handleSubmit = () => {
    setServerError(null)
    startTransition(async () => {
      const result = await completeOnboardingAction()
      if (result && !result.ok) setServerError(result.error)
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Revisión y envío</h2>
      <p className="mt-1 text-sm text-gray-600">
        Revisá que los datos estén correctos antes de finalizar tu onboarding.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Datos del cliente">
          <Row label="Razón social" value={client.legal_name} />
          <Row label="CUIT" value={client.cuit} mono />
          <Row label="Tipo" value={CLIENT_TYPE_LABELS[client.client_type]} />
          <Row label="Email" value={client.contact_email} />
          {client.main_activity && <Row label="Actividad" value={client.main_activity} />}
          {client.annual_revenue && (
            <Row
              label="Facturación anual"
              value={new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
              }).format(Number(client.annual_revenue))}
            />
          )}
        </Card>

        <Card title="Checklist de documentos">
          <ul className="space-y-1.5">
            {requiredDocs.map((t) => {
              const done = uploadedDocTypes.includes(t as DocumentType)
              return (
                <li key={t} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-4 w-4 rounded-full grid place-items-center shrink-0 ${
                      done ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    {done && <CheckCircle2 className="h-3 w-3 text-green-700" />}
                  </span>
                  <span className={done ? "text-gray-900" : "text-gray-500"}>
                    {DOCUMENT_TYPE_LABELS[t as DocumentType]}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            {completedCount} de {requiredDocs.length} completados
          </p>
        </Card>
      </div>

      {members.length > 0 && (
        <div className="mt-4">
          <Card title="Estructura societaria">
            <ul className="divide-y divide-gray-100">
              {members.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{m.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {m.role} · DNI {m.dni}
                    </p>
                  </div>
                  {m.participation_pct !== null && (
                    <span className="text-gray-700 font-medium">
                      {Number(m.participation_pct).toFixed(2)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {serverError && (
        <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Al finalizar, tu perfil queda listo para iniciar solicitudes de crédito.
        </p>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            if (!pending) handleSubmit()
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !pending) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          disabled={pending}
          className="rounded-md bg-[#1b38e8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Finalizando...
            </span>
          ) : (
            "Finalizar onboarding"
          )}
        </button>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline text-sm py-1">
      <dt className="text-gray-600 text-xs uppercase tracking-wide">{label}</dt>
      <dd className={`text-gray-900 ${mono ? "font-mono" : ""} text-right`}>{value}</dd>
    </div>
  )
}
