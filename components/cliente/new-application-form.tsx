"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import {
  applicationCreateSchema,
  type ApplicationCreateInput,
} from "@/lib/validators/schemas"
import { createApplicationAction } from "@/lib/actions/application"

export function NewApplicationForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<ApplicationCreateInput>({
    resolver: zodResolver(applicationCreateSchema),
    defaultValues: {
      client_id: clientId,
      requested_amount: undefined,
      requested_term_months: undefined,
      purpose: "",
    },
  })

  const amount = watch("requested_amount")

  const onSubmit = (values: ApplicationCreateInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await createApplicationAction(values)
      if (!result.ok) {
        setServerError(result.error)
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            if (msgs && msgs[0]) {
              setError(field as keyof ApplicationCreateInput, { message: msgs[0] })
            }
          }
        }
        return
      }
      router.push("/cliente/documentos")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <input type="hidden" {...register("client_id")} />

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Monto solicitado (ARS) *
        </label>
        <input
          type="number"
          step="1000"
          min="1"
          {...register("requested_amount", { valueAsNumber: true })}
          placeholder="Ej: 5000000"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8]"
        />
        {amount && amount > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
              maximumFractionDigits: 0,
            }).format(Number(amount))}
          </p>
        )}
        {errors.requested_amount && (
          <p className="mt-1 text-xs text-red-600">{errors.requested_amount.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Plazo solicitado (en meses) *
        </label>
        <select
          {...register("requested_term_months", { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8]"
        >
          <option value="">Seleccioná...</option>
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
          <option value="18">18 meses</option>
          <option value="24">24 meses</option>
          <option value="36">36 meses</option>
          <option value="48">48 meses</option>
          <option value="60">60 meses</option>
        </select>
        {errors.requested_term_months && (
          <p className="mt-1 text-xs text-red-600">{errors.requested_term_months.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Destino del crédito *
        </label>
        <textarea
          {...register("purpose")}
          rows={4}
          maxLength={500}
          placeholder="Ej: Compra de maquinaria, capital de trabajo, expansión..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8]"
        />
        {errors.purpose && (
          <p className="mt-1 text-xs text-red-600">{errors.purpose.message}</p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#1b38e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Creando legajo...
            </span>
          ) : (
            "Crear solicitud y continuar"
          )}
        </button>
      </div>
    </form>
  )
}
