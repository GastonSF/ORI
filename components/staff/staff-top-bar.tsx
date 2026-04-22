"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { LogOut, ChevronDown, User as UserIcon } from "lucide-react"
import { logoutAction } from "@/lib/actions/auth"
import type { UserRole } from "@/lib/constants/roles"
import { ROLE_LABELS } from "@/lib/constants/roles"

type Props = {
  userName: string
  userEmail: string | null
  role: UserRole
}

export function StaffTopBar({ userName, userEmail, role }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar el menú al clickear fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }
  }, [menuOpen])

  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <header className="fixed top-0 left-0 right-0 h-14 border-b border-gray-200 bg-white z-40 flex items-center justify-between px-4 md:px-6">
      {/* Logo */}
      <Link href="/staff" className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-[#1b38e8]">
          WORCAP
        </span>
        <span className="hidden sm:inline text-xs text-gray-400 uppercase tracking-wider">
          Staff
        </span>
      </Link>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 pl-2 pr-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
        >
          {/* Avatar con iniciales */}
          <div className="h-7 w-7 rounded-full bg-[#1b38e8] text-white text-xs font-semibold flex items-center justify-center">
            {initials || <UserIcon className="h-3.5 w-3.5" />}
          </div>
          {/* Nombre + rol */}
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold text-gray-900">
              {userName}
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
              {ROLE_LABELS[role]}
            </span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {userName}
              </p>
              {userEmail && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {userEmail}
                </p>
              )}
              <span className="inline-block mt-2 text-[10px] font-medium uppercase tracking-wide text-[#1b38e8] bg-[#eff3ff] px-2 py-0.5 rounded">
                {ROLE_LABELS[role]}
              </span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4 text-gray-500" />
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}
