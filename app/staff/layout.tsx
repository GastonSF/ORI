import { requireAnyRole } from "@/lib/auth/session"
import { StaffTopBar } from "@/components/staff/staff-top-bar"
import { StaffSidebar } from "@/components/staff/staff-sidebar"
import type { UserRole } from "@/lib/constants/roles"
import { Toaster } from "sonner"
import { FooterCredit } from "@/components/shared/footer-credit"

/**
 * Layout global del staff (oficial, analista, admin).
 *
 * - Valida que el usuario esté logueado con un rol de staff.
 *   Si no, `requireAnyRole` redirige al dashboard que corresponda.
 * - Provee TopBar fija arriba (logo + user menu con logout).
 * - Provee Sidebar a la izquierda con navegación por rol.
 * - Envuelve el contenido con padding consistente.
 * - Registra el <Toaster> de sonner para feedback de acciones.
 */
export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireAnyRole(["officer", "analyst", "admin"])
  const role = profile.role as UserRole

  return (
    <div className="min-h-screen bg-white">
      <StaffTopBar
        userName={profile.full_name ?? "Usuario"}
        userEmail={user.email}
        role={role}
      />
      <StaffSidebar role={role} />

      {/* Contenido: deja espacio para TopBar (56px) y Sidebar (240px en md+) */}
      <main className="pt-14 md:pl-60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
        <FooterCredit />
      </main>

      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
      />
    </div>
  )
}
