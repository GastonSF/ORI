import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-[#1b38e8] text-white p-12">
        <div>
          <Link href="/" className="text-3xl font-bold tracking-tight">
            WORCAP
          </Link>
          <p className="mt-3 text-blue-100">Plataforma de originación de crédito</p>
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-snug">
            Empezá tu proceso de originación en minutos.
          </h2>
          <ul className="mt-6 space-y-3 text-blue-100 text-sm">
            <li className="flex gap-2"><span>✓</span> Onboarding digital paso a paso</li>
            <li className="flex gap-2"><span>✓</span> Carga segura de documentación</li>
            <li className="flex gap-2"><span>✓</span> Seguimiento en tiempo real</li>
            <li className="flex gap-2"><span>✓</span> Comunicación directa con tu oficial</li>
          </ul>
        </div>
        <p className="text-xs text-blue-200">© {new Date().getFullYear()} WORCAP</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-2xl font-bold tracking-tight text-[#1b38e8]">
              WORCAP
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">Crear tu cuenta</h1>
          <p className="mt-2 text-sm text-gray-600">
            Completá los datos para empezar tu proceso de originación.
          </p>

          <div className="mt-8">
            <RegisterForm />
          </div>

          <div className="mt-6 text-sm text-gray-600">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-[#1b38e8] hover:underline font-medium">
              Iniciá sesión
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
