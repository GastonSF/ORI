import Link from "next/link"
import { requireAnyRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  STAFF_BUCKETS,
  STAFF_BUCKET_LABELS,
  STAFF_BUCKET_COLORS,
  STAFF_BUCKET_DESCRIPTIONS,
  APPLICATION_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  FUNDING_LINE_LABELS,
  getStaffBucket,
  type StaffBucket,
  type ApplicationStatus,
  type ClientType,
  type FundingLine,
} from "@/lib/constants/roles"
import {
  Inbox,
  Search,
  Building2,
  ArrowRight,
  Clock,
  UserCheck,
  CircleDot,
  Filter,
} from "lucide-react"

type SearchParams = {
  bucket?: string
  asignacion?: string
  q?: string
}

type ApplicationRow = {
  id: string
  application_number: string
  status: ApplicationStatus
  assigned_officer_id: string | null
  funding_line: FundingLine | null
  submitted_at: string | null
  created_at: string
  requested_amount: number | null
  client: {
    id: string
    legal_name: string
    cuit: string
    client_type: ClientType
  } | null
  assigned_officer: {
    full_name: string
  } | null
}

export default async function StaffInboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { user } = await requireAnyRole(["officer", "analyst", "admin"])
  const supabase = await createClient()
  const params = await searchParams

  // Filtros activos
  const activeBucket = (params.bucket ?? "all") as StaffBucket | "all"
  const activeAsignacion = params.asignacion ?? "all" // all | mine | unassigned
  const searchQuery = params.q?.trim() ?? ""

  // Traer todos los legajos con joins
  const { data: rawApps, error } = await supabase
    .from("applications")
    .select(
      `
        id,
        application_number,
        status,
        assigned_officer_id,
        funding_line,
        submitted_at,
        created_at,
        requested_amount,
        client:clients!inner(id, legal_name, cuit, client_type),
        assigned_officer:profiles!applications_assigned_officer_id_fkey(full_name)
      `
    )
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Error al cargar legajos: {error.message}
        </div>
      </div>
    )
  }

  const apps = (rawApps ?? []).map((a) => {
    // Supabase devuelve relaciones como array o objeto según el caso
    const client = Array.isArray(a.client) ? a.client[0] : a.client
    const assigned_officer = Array.isArray(a.assigned_officer)
      ? a.assigned_officer[0]
      : a.assigned_officer
    return {
      id: a.id,
      application_number: a.application_number,
      status: a.status as ApplicationStatus,
      assigned_officer_id: a.assigned_officer_id,
      funding_line: a.funding_line as FundingLine | null,
      submitted_at: a.submitted_at,
      created_at: a.created_at,
      requested_amount: a.requested_amount,
      client: client ?? null,
      assigned_officer: assigned_officer ?? null,
    } satisfies ApplicationRow
  })

  // Calcular el bucket de cada legajo
  const appsWithBucket = apps.map((app) => ({
    ...app,
    bucket: getStaffBucket(app.status, !!app.assigned_officer_id),
  }))

  // Conteos por bucket (sobre TODO, antes de filtrar por bucket activo)
  const bucketCounts: Record<StaffBucket, number> = {
    unassigned: 0,
    action_worcap: 0,
    waiting_client: 0,
    closed: 0,
  }
  for (const a of appsWithBucket) {
    bucketCounts[a.bucket]++
  }
  const totalCount = appsWithBucket.length

  // Aplicar filtros
  let filtered = appsWithBucket

  if (activeBucket !== "all") {
    filtered = filtered.filter((a) => a.bucket === activeBucket)
  }

  if (activeAsignacion === "mine") {
    filtered = filtered.filter((a) => a.assigned_officer_id === user.id)
  } else if (activeAsignacion === "unassigned") {
    filtered = filtered.filter((a) => !a.assigned_officer_id)
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter((a) => {
      const name = a.client?.legal_name.toLowerCase() ?? ""
      const cuit = a.client?.cuit.toLowerCase() ?? ""
      const num = a.application_number.toLowerCase()
      return name.includes(q) || cuit.includes(q) || num.includes(q)
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* HEADER */}
      <header>
        <div className="flex items-center gap-3">
          <Inbox className="h-7 w-7 text-[#1b38e8]" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Bandeja de legajos
            </h1>
            <p className="text-sm text-gray-600">
              {totalCount} {totalCount === 1 ? "legajo" : "legajos"} en total
            </p>
          </div>
        </div>
      </header>

      {/* FILTROS POR BUCKET (chips) */}
      <section className="flex flex-wrap gap-2">
        <FilterChip
          href={asUrl({ ...params, bucket: undefined })}
          active={activeBucket === "all"}
          label="Todos"
          count={totalCount}
          color="gray"
        />
        {STAFF_BUCKETS.map((bucket) => (
          <FilterChip
            key={bucket}
            href={asUrl({ ...params, bucket })}
            active={activeBucket === bucket}
            label={STAFF_BUCKET_LABELS[bucket]}
            count={bucketCounts[bucket]}
            color={bucket}
          />
        ))}
      </section>

      {/* BÚSQUEDA + FILTRO DE ASIGNACIÓN */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3 flex-wrap">
        <form action="/staff" method="get" className="flex-1 min-w-[240px]">
          {/* Mantener filtros activos al buscar */}
          {activeBucket !== "all" && (
            <input type="hidden" name="bucket" value={activeBucket} />
          )}
          {activeAsignacion !== "all" && (
            <input type="hidden" name="asignacion" value={activeAsignacion} />
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Buscar por empresa, CUIT o número de legajo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1b38e8] focus:ring-1 focus:ring-[#1b38e8]"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">Asignación:</span>
          <AsignacionLink
            href={asUrl({ ...params, asignacion: undefined })}
            active={activeAsignacion === "all"}
            label="Todas"
          />
          <AsignacionLink
            href={asUrl({ ...params, asignacion: "mine" })}
            active={activeAsignacion === "mine"}
            label="Míos"
          />
          <AsignacionLink
            href={asUrl({ ...params, asignacion: "unassigned" })}
            active={activeAsignacion === "unassigned"}
            label="Sin asignar"
          />
        </div>
      </section>

      {/* LISTA DE LEGAJOS */}
      {filtered.length === 0 ? (
        <EmptyState
          searchQuery={searchQuery}
          activeBucket={activeBucket}
          activeAsignacion={activeAsignacion}
        />
      ) : (
        <section className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard key={app.id} app={app} currentUserId={user.id} />
          ))}
        </section>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTES INTERNOS
// ============================================================

function FilterChip({
  href,
  active,
  label,
  count,
  color,
}: {
  href: string
  active: boolean
  label: string
  count: number
  color: StaffBucket | "gray"
}) {
  const colorClasses =
    color === "gray"
      ? {
          activeBg: "bg-gray-900 text-white border-gray-900",
          inactiveBg:
            "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
          dot: "bg-gray-400",
        }
      : {
          activeBg: `${STAFF_BUCKET_COLORS[color].bg} ${STAFF_BUCKET_COLORS[color].text} ${STAFF_BUCKET_COLORS[color].border} ring-1 ring-current`,
          inactiveBg:
            "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
          dot: STAFF_BUCKET_COLORS[color].dot,
        }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
        active ? colorClasses.activeBg : colorClasses.inactiveBg
      }`}
    >
      {color !== "gray" && (
        <span className={`h-2 w-2 rounded-full ${colorClasses.dot}`} />
      )}
      {label}
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? "bg-white/20" : "bg-gray-100"
        }`}
      >
        {count}
      </span>
    </Link>
  )
}

function AsignacionLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-[#1b38e8] text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  )
}

function ApplicationCard({
  app,
  currentUserId,
}: {
  app: ApplicationRow & { bucket: StaffBucket }
  currentUserId: string
}) {
  const colors = STAFF_BUCKET_COLORS[app.bucket]
  const isMine = app.assigned_officer_id === currentUserId
  const dateRef = app.submitted_at ?? app.created_at

  return (
    <Link
      href={`/staff/legajo/${app.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-[#1b38e8] hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Línea 1: número de legajo + badge de estado */}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-mono font-semibold text-gray-900 text-sm">
              {app.application_number}
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {APPLICATION_STATUS_LABELS[app.status]}
            </span>
            {app.funding_line && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {FUNDING_LINE_LABELS[app.funding_line]}
              </span>
            )}
          </div>

          {/* Línea 2: nombre empresa */}
          <h3 className="font-semibold text-gray-900 text-base truncate">
            {app.client?.legal_name ?? "(Sin empresa)"}
          </h3>

          {/* Línea 3: meta data */}
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {app.client && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  CUIT {app.client.cuit}
                </span>
                <span>{CLIENT_TYPE_LABELS[app.client.client_type]}</span>
              </>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(dateRef)}
            </span>
            {app.assigned_officer ? (
              <span className="inline-flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {isMine ? "Asignado a vos" : `Asignado a ${app.assigned_officer.full_name}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <CircleDot className="h-3 w-3" />
                Sin asignar
              </span>
            )}
            {app.requested_amount != null && (
              <span className="font-medium text-gray-700">
                Solicita {formatARS(app.requested_amount)}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 self-center">
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </Link>
  )
}

function EmptyState({
  searchQuery,
  activeBucket,
  activeAsignacion,
}: {
  searchQuery: string
  activeBucket: string
  activeAsignacion: string
}) {
  const hasFilters =
    searchQuery !== "" ||
    activeBucket !== "all" ||
    activeAsignacion !== "all"

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      {hasFilters ? (
        <>
          <h3 className="text-base font-semibold text-gray-900">
            No hay legajos con esos filtros
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Probá ajustar los filtros o limpiar la búsqueda.
          </p>
          <Link
            href="/staff"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1b38e8] hover:underline"
          >
            Limpiar filtros →
          </Link>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold text-gray-900">
            Todavía no hay legajos en el sistema
          </h3>
