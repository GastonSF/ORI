"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators/schemas"
import { resetPasswordAction } from "@/lib/actions/auth"

export function ResetPasswordForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  })

  const onSubmit = (values: ResetPasswordInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await resetPasswordAction(values)
      if (!result.ok) {
        setServerError(result.error)
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            if (msgs && msgs[0]) {
              setError(field as keyof ResetPasswordInput, { message: msgs[0] })
            }
          }
        }
      } else {
        setSuccess(true)
        setTimeout(() => router.push("/login"), 2500)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div className="text-green-800">
            Contraseña actualizada. Redirigiéndote al login...
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Nueva contraseña
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
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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

      {serverError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[#1b38e8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1730c4] disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
          </span>
        ) : (
          "Actualizar contraseña"
        )}
      </button>
    </form>
  )
}
