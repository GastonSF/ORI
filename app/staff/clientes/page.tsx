import Link from "next/link"
import { requireAnyRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  Users,
  Building2,
  Search,
  ArrowRight,
  FileText,
} from "lucide-react"
import {
  CLIENT_TYPE_LABELS,
  type ClientType,
} from "@/lib/constants/roles"

type SearchParams = {
  q?: string
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAnyRole(["officer", "analyst", "admin"])
  const supabase = await createClient()
  const params = await searchParams
  const searchQuery = params.q?.trim() ?? ""

  // Traer todos los clientes con el conteo de legajos de cada uno
  const { data: rawClients, error } = await supabase
    .from("clients")
    .select(
      `
        id,
        legal_name,
        cuit,
        client_type,
        contact_email,
        contact_phone,
        city,
        province,
        created_at,
        applications(id)
      `
    )
    .order("legal_name", { ascending: true })

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Error al cargar clientes: {error.message}
      </div>
    )
  }

  // Enriquecer con conteo de legajos
  const allClients = (rawClients ?? []).map((c) => ({
    id: c.id,
    legal_name: c.legal_name,
    cuit: c.cuit,
    client_type: c.client_type as ClientType,
    contact_email: c.contact_email,
    contact_phone: c.contact_phone,
    city: c.city,
    province: c.province,
    created_at: c.created_at,
    legajos_count: Array.isArray(c.applications) ? c.applications.length : 0,
  }))

  // Filtro por search
  const filtered = searchQuery
    ? allClients.filter((c) => {
        const q = searchQuery.toLowerCase()
        return (
          c.legal_name.toLowerCase().includes(q) ||
          c.cuit.toLowerCase().includes(q) ||
          c.contact_email.toLowerCase().includes(q)
        )
      })
    : allClients

  const totalCount = allClients.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Users className="h-7 w-7 text-[#1b38e8]" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? "empresa" : "empresas"} en el sistema
          </p>
        </div>
      </header>

      {/* Búsqueda */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <form action="/staff/clientes" method="get">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Buscar por empresa, CUIT o email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8]"
            />
          </div>
        </form>
      </section>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery} />
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/staff/clientes/${client.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Icon */}
              <div className="h-10 w-10 rounded-lg bg-[#eff3ff] flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-[#1b38e8]" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {client.legal_name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-600 bg-gray-100 border border-gray-200">
                    {CLIENT_TYPE_LABELS[client.client_type]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  <span className="font-mono">CUIT {client.cuit}</span>
                  <span>·</span>
                  <span className="truncate">{client.contact_email}</span>
                  {(client.city || client.province) && (
                    <>
                      <span>·</span>
                      <span>
                        {[client.city, client.province]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Legajos count */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                <FileText className="h-3.5 w-3.5" />
                <span>
                  <span className="font-semibold text-gray-900">
                    {client.legajos_count}
                  </span>{" "}
                  {client.legajos_count === 1 ? "legajo" : "legajos"}
                </span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      {hasSearch ? (
        <>
          <h3 className="text-base font-semibold text-gray-900">
            No encontramos clientes con esa búsqueda
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Probá con otro término o limpiá la búsqueda.
          </p>
          <Link
            href="/staff/clientes"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1b38e8] hover:underline"
          >
            Limpiar búsqueda →
          </Link>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold text-gray-900">
            Todavía no hay clientes
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Los clientes aparecen acá cuando se registran en la plataforma.
          </p>
        </>
      )}
    </div>
  )
}
