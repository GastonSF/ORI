import Link from "next/link"
import { UserCircle2, Briefcase, BarChart3, ShieldCheck } from "lucide-react"
import { getOptionalUser } from "@/lib/auth/session"
import { ROLE_DASHBOARDS, type UserRole } from "@/lib/constants/roles"
import { redirect } from "next/navigation"

export default async function LandingPage() {
  // Si ya está logueado, ir directo a su dashboard
  const { profile } = await getOptionalUser()
  if (profile) {
    redirect(ROLE_DASHBOARDS[profile.role as UserRole])
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel de marca */}
      <aside className="flex flex-col justify-between bg-[#1b38e8] text-white p-8 lg:p-12">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">WORCAP</h1>
          <p className="mt-3 text-blue-100">Plataforma de originación de crédito</p>
        </div>

        <div className="mt-12 lg:mt-0 max-w-md">
          <p className="text-blue-100 leading-relaxed">
            Simplificamos el proceso de onboarding y análisis crediticio para empresas de todos los tamaños. Seguro, eficiente y transparente.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-blue-200">
            <ShieldCheck className="h-4 w-4" />
            Datos alojados en Sudamérica · Encriptación end-to-end
          </div>
        </div>

        <p className="mt-8 text-xs text-blue-200">© {new Date().getFullYear()} WORCAP</p>
      </aside>

      {/* Panel de selección */}
      <main className="flex flex-col justify-center p-8 lg:p-16 bg-white">
        <div className="max-w-lg">
          <h2 className="text-xl font-semibold text-gray-900">
            ¿Cómo querés continuar?
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Accedé según tu perfil.
          </p>

          <div className="mt-8 space-y-3">
            <ProfileCard
              href="/register"
              icon={<UserCircle2 className="h-6 w-6" />}
              title="Soy cliente"
              subtitle="Crear cuenta y empezar mi onboarding"
              highlight
            />
            <ProfileCard
              href="/login"
              icon={<UserCircle2 className="h-6 w-6" />}
              title="Ya tengo cuenta"
              subtitle="Iniciar sesión como cliente o usuario WORCAP"
            />
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Equipo WORCAP
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <TeamCard
                icon={<Briefcase className="h-5 w-5" />}
                title="Oficial"
                subtitle="Gestionar clientes y legajos"
              />
              <TeamCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Analista"
                subtitle="Revisar y dictaminar"
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Si sos parte del equipo, usá <Link href="/login" className="text-[#1b38e8] hover:underline">iniciar sesión</Link> con las credenciales que te envió el administrador.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function ProfileCard({
  href,
  icon,
  title,
  subtitle,
  highlight,
}: {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 transition hover:border-[#1b38e8] hover:shadow-sm ${
        highlight ? "border-[#1b38e8] bg-blue-50/50" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="text-[#1b38e8] shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </Link>
  )
}

function TeamCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-start gap-2 text-gray-700">
        <div className="text-[#1b38e8] shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-gray-600">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
