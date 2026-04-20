import Link from "next/link"
import { logoutAction } from "@/lib/actions/auth"
import { ROLE_LABELS, type UserRole } from "@/lib/constants/roles"
import { LogOut } from "lucide-react"
import type { Profile } from "@/types/database.types"

export function TopBar({ profile, subtitle }: { profile: Profile; subtitle?: string }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="text-[#1b38e8] font-bold tracking-tight">
            WORCAP
          </Link>
          {subtitle && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-700 truncate">{subtitle}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
              {profile.full_name}
            </p>
            <p className="text-xs text-gray-500">
              {ROLE_LABELS[profile.role as UserRole]}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
