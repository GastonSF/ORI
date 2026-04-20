import Link from "next/link"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-[#1b38e8]">
          WORCAP
        </Link>

        <h1 className="mt-6 text-xl font-semibold text-gray-900">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-gray-600">
          Elegí una contraseña segura para tu cuenta.
        </p>

        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}
