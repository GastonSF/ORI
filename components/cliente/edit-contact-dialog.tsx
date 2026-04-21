"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Mail, Phone, MapPin, Loader2, Pencil } from "lucide-react"
import { updateClientContactAction, type UpdateContactInput } from "@/lib/actions/client"

type Props = {
  initial: {
    contact_email: string
    contact_phone: string | null
    fiscal_address: string | null
    city: string | null
    province: string | null
    postal_code: string | null
  }
  triggerClassName?: string
}

export function EditContactDialog({ initial, triggerClassName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState<UpdateContactInput>({
    contact_email: initial.contact_email,
    contact_phone: initial.contact_phone ?? "",
    fiscal_address: initial.fiscal_address ?? "",
    city: initial.city ?? "",
    province: initial.province ?? "",
    postal_code: initial.postal_code ?? "",
  })

  const onOpen = () => {
    setOpen(true); setError(null); setFieldErrors({})
    setForm({
      contact_email: initial.contact_email,
      contact_phone: initial.contact_phone ?? "",
      fiscal_address: initial.fiscal_address ?? "",
      city: initial.city ?? "",
      province: initial.province ?? "",
      postal_code: initial.postal_code ?? "",
    })
  }
  const onClose = () => { if (!saving) setOpen(false) }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setFieldErrors({})
    const result = await updateClientContactAction(form)
    if (!result.ok) {
      setError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setSaving(false)
      return
    }
    setSaving(false); setOpen(false); router.refresh()
  }

  return (
    <>
      <button type="button" onClick={onOpen}
        className={triggerClassName ?? "inline-flex items-center gap-1.5 text-xs font-medium text-[#1b38e8] hover:underline"}>
        <Pencil className="h-3.5 w-3.5" /> Editar contacto
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
          <div className="relative z-10 grid place-items-center min-h-screen p-4">
            <div role="dialog" aria-modal="true"
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Editar datos de contacto</h2>
                <button type="button" onClick={onClose} disabled={saving}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100">
                <p className="text-xs text-gray-700">
                  Podés actualizar email, teléfono y domicilio. La razón social
                  y el CUIT no se pueden modificar desde acá — contactá a tu
                  oficial si necesitás cambiarlos.
                </p>
              </div>
              <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Email de contacto *
                  </label>
                  <input type="email" value={form.contact_email} required
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8] focus:outline-none" />
                  {fieldErrors.contact_email && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.contact_email[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Phone className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Teléfono
                  </label>
                  <input type="tel" value={form.contact_phone} placeholder="+54 11 1234 5678"
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8] focus:outline-none" />
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Domicilio fiscal
                  </p>
                  <div className="space-y-3">
                    <input type="text" value={form.fiscal_address} placeholder="Calle y número"
                      onChange={(e) => setForm({ ...form, fiscal_address: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8] focus:outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={form.city} placeholder="Ciudad"
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8] focus:outline-none" />
                      <input type="text" value={form.province} placeholder="Provincia"
                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8] focus:outline-none" />
                    </div>
                    <input type="text" value={form.postal_code} placeholder="Código postal"
                      onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                      className="w-full sm:w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8] focus:outline-none" />
                  </div>
                </div>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}
              </form>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button type="button" onClick={onClose} disabled={saving}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={onSubmit} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50">
                  {saving ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...</>) : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
