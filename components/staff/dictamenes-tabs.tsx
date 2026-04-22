"use client"

import Link from "next/link"

type Props = {
  activeTab: "pendientes" | "emitidos"
  pendientesCount: number
  emitidosCount: number
}

/**
 * Pestañas para la página de Dictámenes.
 *
 * Usa querystring ?tab=pendientes|emitidos para mantener el estado en la URL.
 * Es client component solo para tener hover y focus limpios con Links.
 */
export function DictamenesTabs({
  activeTab,
  pendientesCount,
  emitidosCount,
}: Props) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1 -mb-px">
        <TabLink
          href="/staff/dictamenes?tab=pendientes"
          active={activeTab === "pendientes"}
          label="Pendientes"
          count={pendientesCount}
        />
        <TabLink
          href="/staff/dictamenes?tab=emitidos"
          active={activeTab === "emitidos"}
          label="Emitidos"
          count={emitidosCount}
        />
      </nav>
    </div>
  )
}

function TabLink({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-[#1b38e8] text-[#1b38e8]"
          : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
      }`}
    >
      {label}
      <span
        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
          active
            ? "bg-[#eff3ff] text-[#1b38e8]"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {count}
      </span>
    </Link>
  )
}
