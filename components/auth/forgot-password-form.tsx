"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle2 } from "lucide-react"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators/schemas"
import { forgotPasswordAction } from "@/lib/actions/auth"

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = (values: ForgotPasswordInput) => {
    startTransition(async () => {
      await forgotPasswordAction(values)
      // Siempre mostramos éxito (por seguridad no revelamos si el email existe)
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div className="text-green-800">
            Si el email está registrado, te enviamos un enlace para elegir una nueva contraseña. Revisá tu bandeja de entrada.
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={pending}
          {...register("email")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8] disabled:bg-gray-50"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[#1b38e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1730c4] disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
          </span>
        ) : (
          "Enviar enlace"
        )}
      </button>
    </form>
  )
}
