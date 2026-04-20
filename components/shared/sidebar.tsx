"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  Inbox,
  CheckSquare,
  Settings,
  BarChart3,
  FolderKanban,
} from "lucide-react"
import type { UserRole } from "@/lib/constants/roles"

type NavItem = { href: string; label: string; icon: React.ReactNode }

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Panel", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/admin/usuarios", label: "Usuarios", icon: <Users className="h-4 w-4" /> },
    { href: "/admin/clientes", label: "Clientes", icon: <FolderKanban className="h-4 w-4" /> },
    { href: "/admin/legajos", label: "Legajos", icon: <FileText className="h-4 w-4" /> },
    { href: "/admin/reportes", label: "Reportes", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/admin/configuracion", label: "Configuración", icon: <Settings className="h-4 w-4" /> },
  ],
  officer: [
    { href: "/oficial", label: "Bandeja", icon: <Inbox className="h-4 w-4" /> },
    { href: "/oficial/clientes", label: "Clientes", icon: <Users className="h-4 w-4" /> },
    { href: "/oficial/legajos", label: "Legajos", icon: <FileText className="h-4 w-4" /> },
  ],
  analyst: [
    { href: "/analista", label: "Cola de análisis", icon: <Inbox className="h-4 w-4" /> },
    { href: "/analista/dictamenes", label: "Mis dictámenes", icon: <CheckSquare className="h-4 w-4" /> },
  ],
  client: [
    { href: "/cliente", label: "Panel", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/cliente/solicitud", label: "Mi solicitud", icon: <FileText className="h-4 w-4" /> },
    { href: "/cliente/documentos", label: "Documentación", icon: <FolderKanban className="h-4 w-4" /> },
  ],
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const items = NAV_BY_ROLE[role]

  return (
    <nav className="hidden md:flex w-56 shrink-0 flex-col bg-white border-r border-gray-200 p-3">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role === "officer" ? "oficial" : role === "analyst" ? "analista" : role}` &&
              pathname.startsWith(item.href))
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                  isActive
                    ? "bg-[#1b38e8] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
