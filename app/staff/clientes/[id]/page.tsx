import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAnyRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  FileText,
  ArrowRight,
  Clock,
} from "lucide-react"
import {
  CLIENT_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  FUNDING_LINE_LABELS,
  type ClientType,
  type ApplicationStatus,
  type FundingLine,
} from "@/lib/constants/roles"
import { LegajoMiniTimeline } from "@/components/staff/legajo-mini-timeline"

type Params = { id: string }

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<Params>
}) {
  await requireAnyRole(["officer", "analyst", "admin"])
  const { id } = await params
  const supabase = await createClient()

  // Datos del cliente
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (clientError || !client) {
    notFound()
  }

  // Legajos de este cliente
  const { data: rawApplications } = await supabase
    .from("applications")
    .select(
      `
        id,
        application_number,
        status,
        funding_line,
        submitted_at,
        created_at,
        requested_amount
      `
    )
    .eq("client_id", id)
    .order("created_at", { ascending: false })

  const applications = rawApplications ?? []

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/staff/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1b38e8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
      </div>

      {/* Header del cliente */}
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-14 w-14 rounded-lg bg-[#eff3ff] flex items-center justify-center shrink-0">
            <Building2 className="h-7 w-7 text-[#1b38e8]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold text-gray-900">
                {client.legal_name}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-600 bg-gray-100 border border-gray-200">
                {CLIENT_TYPE_LABELS[client.client_type as ClientType]}
              </span>
            </div>
            <p className="mt-1 text-sm font-mono text-gray-500">
              CUIT {client.cuit}
            </p>
          </div>
        </div>
      </header>

      {/* Grid: info de contacto + métricas */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Información de contacto */}
        <section className="md:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Información
            </h2>
          </div>
          <dl className="divide-y divide-gray-100">
            <InfoRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={client.contact_email}
              mono
            />
            <InfoRow
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono"
              value={client.contact_phone}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Domicilio"
              value={formatAddress(client)}
            />
            <InfoRow
              icon={<TrendingUp className="h-4 w-4" />}
              label="Actividad principal"
              value={client.main_activity}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Inicio de actividad"
              value={
                client.activity_start_date
                  ? new Date(client.activity_start_date).toLocaleDateString(
                      "es-AR",
                      { day: "2-digit", month: "long", year: "numeric" }
                    )
                  : null
              }
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Facturación anual"
              value={
                client.annual_revenue != null
                  ? formatARS(Number(client.annual_revenue))
                  : null
              }
              mono
            />
          </dl>
        </section>

        {/* Métricas rápidas */}
        <section className="space-y-4">
          <MetricCard
            label="Legajos totales"
            value={applications.length.toString()}
            icon={<FileText className="h-5 w-5" />}
          />
          <MetricCard
            label="Cliente desde"
            value={new Date(client.created_at).toLocaleDateString("es-AR", {
              month: "short",
              year: "numeric",
            })}
            icon={<Clock className="h-5 w-5" />}
          />
        </section>
      </div>

      {/* Lista de legajos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Legajos ({applications.length})
          </h2>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Este cliente todavía no tiene legajos.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/staff/legajo/${app.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="font-mono font-semibold text-sm text-gray-900">
                      {app.application_number}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-[#1b38e8] bg-[#eff3ff] border border-blue-200">
                      {APPLICATION_STATUS_LABELS[app.status as ApplicationStatus]}
                    </span>
                    {app.funding_line && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-700 bg-gray-100 border border-gray-200">
                        {FUNDING_LINE_LABELS[app.funding_line as FundingLine]}
                      </span>
                    )}
                  </div>
                  <LegajoMiniTimeline status={app.status as ApplicationStatus} />
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>
                      Creado el{" "}
                      {new Date(app.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {app.requested_amount != null && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-gray-700">
                          Solicita {formatARS(Number(app.requested_amount))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ============================================================
// Componentes internos
// ============================================================

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd
          className={`mt-0.5 text-sm text-gray-900 ${
            mono ? "font-mono" : ""
          } ${!value ? "text-gray-400 italic" : ""}`}
        >
          {value || "—"}
        </dd>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function formatAddress(client: {
  fiscal_address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
}): string | null {
  const parts = [
    client.fiscal_address,
    client.city,
    client.province,
    client.postal_code ? `CP ${client.postal_code}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}
