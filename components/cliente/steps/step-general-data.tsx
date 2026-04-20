"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import type { Client } from "@/types/database.types"
import {
  clientGeneralDataSchema,
  type ClientGeneralDataInput,
} from "@/lib/validators/schemas"
import { saveGeneralDataAction } from "@/lib/actions/client"

type Props = { client: Client | null; onDone: () => void }

const PROVINCIAS = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
]

const ACTIVIDADES = [
  "Comercio mayorista", "Comercio minorista", "Servicios profesionales",
  "Industria manufacturera", "Agropecuario", "Construcción", "Tecnología / SaaS",
  "Gastronomía", "Transporte y logística", "Inmobiliario", "Otro",
]

export function StepGeneralData({ client, onDone }: Props) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const isPlaceholderName = !client?.legal_name || client.legal_name === "__pendiente__"
  const isPlaceholderCuit = !client?.cuit || client.cuit.startsWith("00-")

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ClientGeneralDataInput>({
    resolver: zodResolver(clientGeneralDataSchema),
    defaultValues: {
      legal_name: isPlaceholderName ? "" : client!.legal_name,
      cuit: isPlaceholderCuit ? "" : client!.cuit,
      contact_email:
        client?.contact_email && client.contact_email !== "__pendiente__"
          ? client.contact_email
          : "",
      contact_phone: client?.contact_phone ?? "",
      fiscal_address: client?.fiscal_address ?? "",
      city: client?.city ?? "",
      province: client?.province ?? "",
      postal_code: client?.postal_code ?? "",
      main_activity: client?.main_activity ?? "",
      activity_start_date: client?.activity_start_date ?? "",
      annual_revenue: client?.annual_revenue ?? undefined,
    },
  })

  const onSubmit = (values: ClientGeneralDataInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await saveGeneralDataAction(values)
      if (!result.ok) {
        setServerError(result.error)
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            if (msgs && msgs[0]) setError(field as keyof ClientGeneralDataInput, { message: msgs[0] })
          }
        }
        return
      }
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="text-xl font-semibold text-gray-900">Datos generales</h2>
      <p className="mt-1 text-sm text-gray-600">
        Cargá los datos de tu empresa. Los campos con * son obligatorios.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Razón social / Nombre completo *</Label>
          <Input {...register("legal_name")} placeholder="Ej: Distribuidora Del Norte SRL" />
          {errors.legal_name && <FieldError>{errors.legal_name.message}</FieldError>}
        </div>

        <div>
          <Label>CUIT *</Label>
          <Input {...register("cuit")} placeholder="30-71234567-8" />
          <p className="mt-1 text-xs text-gray-500">Formato: XX-XXXXXXXX-X</p>
          {errors.cuit && <FieldError>{errors.cuit.message}</FieldError>}
        </div>

        <div>
          <Label>Email de contacto *</Label>
          <Input type="email" {...register("contact_email")} />
          {errors.contact_email && <FieldError>{errors.contact_email.message}</FieldError>}
        </div>

        <div>
          <Label>Teléfono</Label>
          <Input {...register("contact_phone")} placeholder="+54 9 11 1234 5678" />
          {errors.contact_phone && <FieldError>{errors.contact_phone.message}</FieldError>}
        </div>

        <div className="sm:col-span-2">
          <Label>Domicilio fiscal</Label>
          <Input {...register("fiscal_address")} placeholder="Av. Corrientes 1234" />
        </div>

        <div>
          <Label>Ciudad</Label>
          <Input {...register("city")} />
        </div>

        <div>
          <Label>Provincia</Label>
          <Select {...register("province")}>
            <option value="">Seleccioná...</option>
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Código postal</Label>
          <Input {...register("postal_code")} />
        </div>

        <div>
          <Label>Actividad principal</Label>
          <Select {...register("main_activity")}>
            <option value="">Seleccioná...</option>
            {ACTIVIDADES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Fecha de inicio de actividad</Label>
          <Input type="date" {...register("activity_start_date")} />
        </div>

        <div>
          <Label>Facturación anual estimada (ARS)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register("annual_revenue", { valueAsNumber: true })}
            placeholder="45000000"
          />
          {errors.annual_revenue && <FieldError>{errors.annual_revenue.message}</FieldError>}
        </div>
      </div>

      {serverError && (
        <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={pending}
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
    </form>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700">{children}</label>
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

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-red-600">{children}</p>
}
