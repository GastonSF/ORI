import Link from "next/link"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-[#1b38e8]">
          WORCAP
        </Link>

        <h1 className="mt-6 text-xl font-semibold text-gray-900">
          Recuperar contraseña
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Ingresá tu email y te enviaremos un enlace para elegir una nueva contraseña.
        </p>

        <div className="mt-6">
          <ForgotPasswordForm />
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <Link href="/login" className="text-[#1b38e8] hover:underline">
            ← Volver al login
          </Link>
        </div>
      </div>
    </div>
  )
}
