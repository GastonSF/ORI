"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { registerClientSchema, type RegisterClientInput } from "@/lib/validators/schemas"
import { registerClientAction } from "@/lib/actions/auth"

export function RegisterForm() {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterClientInput>({
    resolver: zodResolver(registerClientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
      accept_terms: undefined,
    },
  })

  const password = watch("password")

  const onSubmit = (values: RegisterClientInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await registerClientAction(values)
      if (!result.ok) {
        setServerError(result.error)
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            if (msgs && msgs[0]) {
              setError(field as keyof RegisterClientInput, { message: msgs[0] })
            }
          }
        }
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-6 text-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-semibold text-green-900">¡Cuenta creada!</h2>
            <p className="mt-1 text-green-800">
              Te enviamos un email para verificar tu dirección. Revisá tu bandeja (y spam, por las dudas) y hacé clic en el enlace para activar la cuenta.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const passwordChecks = getPasswordChecks(password ?? "")

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
          Nombre completo
        </label>
        <input
          id="full_name"
          type="text"
          autoComplete="name"
          disabled={pending}
          {...register("full_name")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8] disabled:bg-gray-50"
        />
        {errors.full_name && (
          <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
        )}
      </div>

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

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Teléfono <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          disabled={pending}
          placeholder="+54 9 11 1234 5678"
          {...register("phone")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8] disabled:bg-gray-50"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            disabled={pending}
            {...register("password")}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8] disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Ocultar" : "Mostrar"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && password.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            <PasswordCheck ok={passwordChecks.minLength} text="Mínimo 10 caracteres" />
            <PasswordCheck ok={passwordChecks.hasUpper} text="Al menos una mayúscula" />
            <PasswordCheck ok={passwordChecks.hasLower} text="Al menos una minúscula" />
            <PasswordCheck ok={passwordChecks.hasNumber} text="Al menos un número" />
          </ul>
        )}
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
          Repetí la contraseña
        </label>
        <input
          id="confirm_password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          disabled={pending}
          {...register("confirm_password")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1b38e8] focus:outline-none focus:ring-1 focus:ring-[#1b38e8] disabled:bg-gray-50"
        />
        {errors.confirm_password && (
          <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>
        )}
      </div>

      <label className="flex gap-2 items-start text-sm text-gray-700">
        <input
          type="checkbox"
          disabled={pending}
          {...register("accept_terms")}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1b38e8] focus:ring-[#1b38e8]"
        />
        <span>
          Acepto los términos y condiciones y la política de privacidad de WORCAP.
        </span>
      </label>
      {errors.accept_terms && (
        <p className="text-xs text-red-600">{errors.accept_terms.message}</p>
      )}

      {serverError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[#1b38e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1730c4] focus:outline-none focus:ring-2 focus:ring-[#1b38e8] focus:ring-offset-2 disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Creando cuenta...
          </span>
        ) : (
          "Crear cuenta"
        )}
      </button>
    </form>
  )
}

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 10,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }
}

function PasswordCheck({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-green-600" : "text-gray-500"}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {text}
    </li>
  )
}
