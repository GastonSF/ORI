"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import type { Client, CompanyMember } from "@/types/database.types"
import { saveCompanyMembersAction } from "@/lib/actions/client"

type Props = { client: Client | null; members: CompanyMember[]; onDone: () => void }

type MemberRow = {
  full_name: string
  dni: string
  role: string
  participation_pct: string
}

const ROLES = ["Socio", "Socio gerente", "Director", "Presidente", "Apoderado", "Síndico"]

export function StepCompanyStructure({ client, members, onDone }: Props) {
  const [rows, setRows] = useState<MemberRow[]>(
    members.length > 0
      ? members.map((m) => ({
          full_name: m.full_name,
          dni: m.dni,
          role: m.role,
          participation_pct: m.participation_pct !== null ? String(m.participation_pct) : "",
        }))
      : [{ full_name: "", dni: "", role: "Socio", participation_pct: "" }]
  )
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const requiresStructure =
    client?.client_type === "srl" ||
    client?.client_type === "sa" ||
    client?.client_type === "cooperativa" ||
    client?.client_type === "entidad_financiera"

  const addRow = () =>
    setRows([...rows, { full_name: "", dni: "", role: "Socio", participation_pct: "" }])

  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))

  const updateRow = (idx: number, field: keyof MemberRow, value: string) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  const totalPct = rows.map((r) => Number(r.participation_pct) || 0).reduce((a, b) => a + b, 0)

  const handleSubmit = () => {
    setServerError(null)

    const toSend = requiresStructure
      ? rows
          .filter((r) => r.full_name.trim() && r.dni.trim() && r.role.trim())
          .map((r) => ({
            full_name: r.full_name.trim(),
            dni: r.dni.trim(),
            role: r.role.trim(),
            participation_pct: r.participation_pct ? Number(r.participation_pct) : null,
          }))
      : []

    if (requiresStructure && toSend.length === 0) {
      setServerError("Agregá al menos un socio/director")
      return
    }

    startTransition(async () => {
      const result = await saveCompanyMembersAction({ members: toSend })
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      onDone()
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Estructura societaria</h2>
      <p className="mt-1 text-sm text-gray-600">
        {requiresStructure
          ? "Agregá los socios, directores y apoderados de la empresa."
          : "Este tipo de cliente no requiere estructura societaria. Podés continuar."}
      </p>

      {requiresStructure && (
        <>
          <div className="mt-6 space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4">
                    <Label>Nombre completo</Label>
                    <Input
                      value={row.full_name}
                      onChange={(e) => updateRow(idx, "full_name", e.target.value)}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>DNI</Label>
                    <Input
                      value={row.dni}
                      onChange={(e) => updateRow(idx, "dni", e.target.value.replace(/\D/g, ""))}
                      placeholder="30123456"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Cargo</Label>
                    <Select value={row.role} onChange={(e) => updateRow(idx, "role", e.target.value)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Participación %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={row.participation_pct}
                      onChange={(e) => updateRow(idx, "participation_pct", e.target.value)}
                      placeholder="50"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={rows.length === 1}
                      className="w-full h-10 rounded-md border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:border-red-200 disabled:opacity-40 grid place-items-center"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1b38e8] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Agregar otro
            </button>
            <span
              className={`text-sm font-medium ${
                Math.abs(totalPct - 100) < 0.01 ? "text-green-700" : "text-gray-500"
              }`}
            >
              Participación total: {totalPct.toFixed(2)}%
              {Math.abs(totalPct - 100) > 0.01 && " (debería sumar 100%)"}
            </span>
          </div>
        </>
      )}

      {serverError && (
        <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
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

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-700">{children}</label>
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8]"
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8]"
    />
  )
}
