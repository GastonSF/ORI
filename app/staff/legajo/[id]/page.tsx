import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAnyRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  Calendar,
  DollarSign,
  FileCheck,
  History,
} from "lucide-react"
import {
  APPLICATION_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  FUNDING_LINE_LABELS,
  type ApplicationStatus,
  type ClientType,
  type FundingLine,
  type DictamenDecision,
} from "@/lib/constants/roles"
import { LegajoDocumentosPanel } from "@/components/staff/legajo-documentos-panel"
import { LegajoDictamenForm } from "@/components/staff/legajo-dictamen-form"

type Params = { id: string }

export default async function LegajoDetallePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { profile } = await requireAnyRole(["officer", "analyst", "admin"])
  const { id } = await params
  const supabase = await createClient()

  // Legajo + cliente
  const { data: rawApp, error } = await supabase
    .from("applications")
    .select(
      `
        id,
        application_number,
        status,
        funding_line,
        requested_amount,
        requested_term_months,
        purpose,
        submitted_at,
        sent_to_analyst_at,
        created_at,
        client:clients!inner(
          id,
          legal_name,
          cuit,
          client_type,
          contact_email,
          contact_phone,
          city,
          province,
          main_activity,
          activity_start_date,
          annual_revenue
        )
      `
    )
    .eq("id", id)
    .single()

  if (error || !rawApp) {
    notFound()
  }

  const client = Array.isArray(rawApp.client) ? rawApp.client[0] : rawApp.client
  if (!client) notFound()

  const app = {
    id: rawApp.id,
    application_number: rawApp.application_number,
    status: rawApp.status as ApplicationStatus,
    funding_line: rawApp.funding_line as FundingLine | null,
    requested_amount: rawApp.requested_amount,
    requested_term_months: rawApp.requested_term_months,
    purpose: rawApp.purpose,
    submitted_at: rawApp.submitted_at,
    sent_to_analyst_at: rawApp.sent_to_analyst_at,
    created_at: rawApp.created_at,
  }

  // Documentos (iniciales y adicionales)
  const { data: rawDocs } = await supabase
    .from("documents")
    .select(
      "id, file_name, file_size_bytes, document_type, doc_phase, status, uploaded_at, created_at"
    )
    .eq("application_id", id)
    .order("created_at", { ascending: true })

  // Pedidos de docs adicionales con su estado
  const { data: rawAddlReqs } = await supabase
    .from("additional_document_requests")
    .select(
      "id, document_name, description, is_required, status, fulfilled_by_document_id"
    )
    .eq("application_id", id)

  const documents = (rawDocs ?? []).map((d) => ({
    id: d.id,
    file_name: d.file_name,
    file_size_bytes: d.file_size_bytes,
    document_type: d.document_type as string,
    doc_phase: d.doc_phase as "initial" | "additional",
    status: d.status as "pending" | "uploaded" | "approved" | "rejected",
    uploaded_at: d.uploaded_at,
  }))

  const additionalRequests = (rawAddlReqs ?? []).map((r) => ({
    id: r.id,
    document_name: r.document_name,
    description: r.description,
    is_required: r.is_required,
    status: r.status as string,
    fulfilled_by_document_id: r.fulfilled_by_document_id,
  }))

  // Dictamen existente (si ya hay uno)
  const { data: existingDictamen } = await supabase
    .from("dictamenes")
    .select(
      "id, decision, approved_amount, term_months, interest_rate, conditions, observations, justification, analyst_id, created_at, edit_count, last_edited_at, last_edited_by"
    )
    .eq("application_id", id)
    .maybeSingle()

  // Histórico: otros legajos del mismo cliente (excluyendo este)
  const { data: rawHistory } = await supabase
    .from("applications")
    .select(
      `
        id,
        application_number,
        status,
        created_at,
        dictamenes(decision)
      `
    )
    .eq("client_id", client.id)
    .neq("id", id)
    .order("created_at", { ascending: false })

  const history = (rawHistory ?? []).map((h) => {
    const dict = Array.isArray(h.dictamenes) ? h.dictamenes[0] : h.dictamenes
    return {
      id: h.id,
      application_number: h.application_number,
      status: h.status as ApplicationStatus,
      decision: (dict?.decision ?? null) as DictamenDecision | null,
      created_at: h.created_at,
    }
  })

  // Calcular métricas
  const metrics = calculateMetrics({
    requested_amount: app.requested_amount ? Number(app.requested_amount) : null,
    annual_revenue: client.annual_revenue ? Number(client.annual_revenue) : null,
    activity_start_date: client.activity_start_date,
    requested_term_months: app.requested_term_months,
    history,
    documents,
    additionalRequests,
  })

  const isDictaminable =
    app.status === "in_risk_analysis" || app.status === "observed"
  const isAnalystOrAdmin =
    profile.role === "analyst" || profile.role === "admin"
  const showDictamenForm = isAnalystOrAdmin && (isDictaminable || !!existingDictamen)

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/staff/dictamenes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1b38e8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a dictámenes
        </Link>
      </div>

      {/* Header del legajo */}
      <header className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-lg bg-[#eff3ff] flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-[#1b38e8]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="font-mono font-semibold text-sm text-gray-900">
                {app.application_number}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-[#1b38e8] bg-[#eff3ff] border border-blue-200">
                {APPLICATION_STATUS_LABELS[app.status]}
              </span>
              {app.funding_line && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-700 bg-gray-100 border border-gray-200">
                  {FUNDING_LINE_LABELS[app.funding_line]}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              {client.legal_name}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              <span className="font-mono">CUIT {client.cuit}</span>
              {" · "}
              {CLIENT_TYPE_LABELS[client.client_type as ClientType]}
            </p>
          </div>
        </div>
      </header>

      {/* Layout 3 columnas: documentos · datos + métricas · dictamen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna izquierda: Documentos */}
        <div className="lg:col-span-3">
          <LegajoDocumentosPanel
            documents={documents}
            additionalRequests={additionalRequests}
          />
        </div>

        {/* Columna central: Datos + Métricas */}
        <div className="lg:col-span-5 space-y-4">
          {/* Métricas automáticas */}
          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Métricas
              </h2>
            </div>
            <dl className="grid grid-cols-2 divide-x divide-y divide-gray-100">
              <Metric
                icon={<DollarSign className="h-4 w-4" />}
                label="Ratio deuda / facturación"
                value={metrics.debtToRevenueRatio}
                hint={metrics.debtToRevenueHint}
              />
              <Metric
                icon={<Calendar className="h-4 w-4" />}
                label="Antigüedad del negocio"
                value={metrics.businessAge}
              />
              <Metric
                icon={<TrendingUp className="h-4 w-4" />}
                label="Facturación mensual est."
                value={metrics.monthlyRevenue}
              />
              <Metric
                icon={<FileCheck className="h-4 w-4" />}
                label="Docs aprobados"
                value={metrics.docsApproved}
              />
            </dl>
          </section>

          {/* Datos del cliente */}
          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Información del cliente
              </h2>
            </div>
            <dl className="divide-y divide-gray-100">
              <InfoRow label="Email" value={client.contact_email} mono />
              <InfoRow label="Teléfono" value={client.contact_phone} />
              <InfoRow
                label="Domicilio"
                value={
                  [client.city, client.province].filter(Boolean).join(", ") ||
                  null
                }
              />
              <InfoRow label="Actividad" value={client.main_activity} />
              <InfoRow
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

          {/* Solicitud */}
          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Solicitud
              </h2>
            </div>
            <dl className="divide-y divide-gray-100">
              <InfoRow
                label="Monto solicitado"
                value={
                  app.requested_amount != null
                    ? formatARS(Number(app.requested_amount))
                    : null
                }
                mono
              />
              <InfoRow
                label="Plazo solicitado"
                value={
                  app.requested_term_months
                    ? `${app.requested_term_months} meses`
                    : null
                }
              />
              <InfoRow label="Destino del crédito" value={app.purpose} />
            </dl>
          </section>

          {/* Historial del cliente */}
          {history.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-gray-500" />
                <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Historial del cliente ({history.length})
                </h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-gray-900">
                        {h.application_number}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(h.created_at).toLocaleDateString("es-AR", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getHistoryBadgeClass(
                        h.status,
                        h.decision
                      )}`}
                    >
                      {APPLICATION_STATUS_LABELS[h.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Columna derecha: Dictamen */}
        <div className="lg:col-span-4">
          {showDictamenForm ? (
            <LegajoDictamenForm
              applicationId={app.id}
              existingDictamen={existingDictamen ?? null}
              applicationStatus={app.status}
            />
          ) : (
            <section className="rounded-xl border border-gray-200 bg-white p-5 text-center">
              <p className="text-sm text-gray-500">
                Este legajo no está en una fase de dictamen.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTES INTERNOS
// ============================================================

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-gray-900 font-mono leading-tight">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-gray-500">{hint}</p>}
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="text-xs text-gray-500 shrink-0">{label}</dt>
      <dd
        className={`text-sm text-right ${mono ? "font-mono" : ""} ${
          value ? "text-gray-900" : "text-gray-400 italic"
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

type MetricsInput = {
  requested_amount: number | null
  annual_revenue: number | null
  activity_start_date: string | null
  requested_term_months: number | null
  history: Array<{ decision: DictamenDecision | null }>
  documents: Array<{ status: string; doc_phase: "initial" | "additional" }>
  additionalRequests: Array<{ status: string; is_required: boolean }>
}

function calculateMetrics(input: MetricsInput) {
  // 1. Ratio deuda/facturación
  let debtToRevenueRatio = "—"
  let debtToRevenueHint: string | undefined = undefined
  if (input.requested_amount && input.annual_revenue && input.annual_revenue > 0) {
    const ratio = (input.requested_amount / input.annual_revenue) * 100
    debtToRevenueRatio = `${ratio.toFixed(1)}%`
    if (ratio < 20) debtToRevenueHint = "Bajo riesgo"
    else if (ratio < 40) debtToRevenueHint = "Riesgo moderado"
    else debtToRevenueHint = "Riesgo elevado"
  }

  // 2. Antigüedad del negocio
  let businessAge = "—"
  if (input.activity_start_date) {
    const start = new Date(input.activity_start_date)
    const years = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    const roundedYears = Math.floor(years)
    if (years < 1) {
      const months = Math.floor(years * 12)
      businessAge = `${months} ${months === 1 ? "mes" : "meses"}`
    } else {
      businessAge = `${roundedYears} ${roundedYears === 1 ? "año" : "años"}`
    }
  }

  // 3. Facturación mensual estimada (anual / 12)
  let monthlyRevenue = "—"
  if (input.annual_revenue && input.annual_revenue > 0) {
    monthlyRevenue = formatARSShort(input.annual_revenue / 12)
  }

  // 4. Docs aprobados vs total
  const totalInitialDocs = input.documents.filter(
    (d) => d.doc_phase === "initial"
  ).length
  const approvedInitialDocs = input.documents.filter(
    (d) => d.doc_phase === "initial" && d.status === "approved"
  ).length
  const totalAddlRequired = input.additionalRequests.filter(
    (r) => r.is_required
  ).length
  const approvedAddl = input.additionalRequests.filter(
    (r) => r.is_required && r.status === "approved"
  ).length
  const totalDocs = totalInitialDocs + totalAddlRequired
  const approvedDocs = approvedInitialDocs + approvedAddl
  const docsApproved = totalDocs > 0 ? `${approvedDocs} / ${totalDocs}` : "—"

  return {
    debtToRevenueRatio,
    debtToRevenueHint,
    businessAge,
    monthlyRevenue,
    docsApproved,
  }
}

function getHistoryBadgeClass(
  status: ApplicationStatus,
  decision: DictamenDecision | null
): string {
  if (decision === "approved" || status === "approved") {
    return "text-emerald-700 bg-emerald-50 border-emerald-200"
  }
  if (
    decision === "rejected" ||
    status === "rejected_by_analyst" ||
    status === "rejected_by_officer"
  ) {
    return "text-red-700 bg-red-50 border-red-200"
  }
  if (
    status === "cancelled_by_client" ||
    status === "cancelled_by_worcap"
  ) {
    return "text-gray-500 bg-gray-50 border-gray-200"
  }
  return "text-[#1b38e8] bg-[#eff3ff] border-blue-200"
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatARSShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`
  }
  return formatARS(amount)
}
