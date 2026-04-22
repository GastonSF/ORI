"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Inbox,
  Users,
  FileText,
  Settings,
  ClipboardCheck,
  LayoutDashboard,
  Building2,
} from "lucide-react"
import type { UserRole } from "@/lib/constants/roles"
import type { LucideIcon } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Si es true, el item se marca activo solo cuando el pathname es exacto. */
  exact?: boolean
}

/**
 * Mapa de navegación por rol.
 *
 * Cada rol ve solo los items pertinentes. Los items están pensados para
 * crecer: algunas rutas (clientes, dictamenes) todavía no existen, pero las
 * dejamos planteadas para tener un sidebar completo desde la Fase 1.
 */
const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  officer: [
    { href: "/staff", label: "Bandeja", icon: Inbox, exact: true },
    { href: "/staff/clientes", label: "Clientes", icon: Users },
    { href: "/staff/mis-legajos", label: "Mis legajos", icon: FileText },
    { href: "/staff/ajustes", label: "Ajustes", icon: Settings },
  ],
  analyst: [
    { href: "/staff", label: "Bandeja", icon: Inbox, exact: true },
    { href: "/staff/dictamenes", label: "Dictámenes", icon: ClipboardCheck },
    { href: "/staff/ajustes", label: "Ajustes", icon: Settings },
  ],
  admin: [
    { href: "/staff", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/staff/usuarios", label: "Usuarios", icon: Users },
    { href: "/staff/clientes", label: "Clientes", icon: Building2 },
    { href: "/staff/legajos", label: "Todos los legajos", icon: FileText },
    { href: "/staff/ajustes", label: "Configuración", icon: Settings },
  ],
  client: [], // no debería pasar por acá, el layout de /staff lo bloquea
}

export function StaffSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const items = NAV_BY_ROLE[role] ?? []

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-60 border-r border-gray-200 bg-white hidden md:flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#eff3ff] text-[#1b38e8]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-[#1b38e8]" : "text-gray-500"}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} WORCAP
        </p>
      </div>
    </aside>
  )
}
