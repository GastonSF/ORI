import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

type SearchParams = Promise<{ error?: string; next?: string }>

const ERROR_MESSAGES: Record<string, string> = {
  missing_profile: "Tu cuenta no tiene un perfil asociado. Contactá al administrador.",
  account_inactive: "Tu cuenta está desactivada. Contactá al administrador.",
  invalid_link: "El enlace no es válido o venció.",
}

export default async function LoginPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const errorMsg = searchParams.error ? ERROR_MESSAGES[searchParams.error] : null

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel lateral de marca */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#1b38e8] text-white p-12">
        <div>
          <Link href="/" className="text-3xl font-bold tracking-tight">
            WORCAP
          </Link>
          <p className="mt-3 text-blue-100">Plataforma de originación de crédito</p>
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-snug">
            Simplificamos el proceso de onboarding y análisis crediticio.
          </h2>
          <p className="mt-3 text-blue-100">
            Seguro, eficiente y transparente, para empresas de todos los tamaños.
          </p>
        </div>
        <p className="text-xs text-blue-200">© {new Date().getFullYear()} WORCAP</p>
      </aside>

      {/* Panel de formulario */}
      <main className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-2xl font-bold tracking-tight text-[#1b38e8]">
              WORCAP
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">Iniciá sesión</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ingresá con tu cuenta para continuar.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <div className="mt-8">
            <LoginForm nextPath={searchParams.next} />
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-[#1b38e8] hover:underline"
            >
              Olvidé mi contraseña
            </Link>
            <Link href="/register" className="text-gray-600 hover:text-gray-900">
              Crear cuenta
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
