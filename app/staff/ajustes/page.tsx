import { requireAnyRole } from "@/lib/auth/session"
import { AjustesForm } from "@/components/staff/ajustes-form"
import type { UserRole } from "@/lib/constants/roles"
import { Settings } from "lucide-react"

/**
 * Página de Ajustes del staff.
 *
 * Permite al usuario actualizar sus datos básicos (nombre, teléfono) y
 * cambiar su contraseña. Email y rol son de sólo lectura (email no se puede
 * cambiar sin un flow de verificación, y el rol lo asigna un administrador).
 */
export default async function AjustesPage() {
  const { user, profile } = await requireAnyRole([
    "officer",
    "analyst",
    "admin",
  ])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[#1b38e8]" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ajustes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Administrá tu información personal y la seguridad de tu cuenta.
          </p>
        </div>
      </header>

      <AjustesForm
        userName={profile.full_name ?? ""}
        userEmail={user.email ?? ""}
        userPhone={profile.phone ?? null}
        role={profile.role as UserRole}
      />
    </div>
  )
}
