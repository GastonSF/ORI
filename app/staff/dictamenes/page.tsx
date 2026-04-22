import Link from "next/link"
import type { ComponentType } from "react"
import { requireAnyRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  ClipboardCheck,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react"
import {
  APPLICATION_STATUS_LABELS,
  DICTAMEN_DECISION_LABELS,
  FUNDING_LINE_LABELS,
  type ApplicationStatus,
  type DictamenDecision,
  type FundingLine,
} from "@/lib/constants/roles"
import { DictamenesTabs } from "@/components/staff/dictamenes-tabs"

type SearchParams = {
  tab?: string
}

type DecisionMeta = {
  Icon: ComponentType<{ className?: string }>
  bg: string
  text: string
  border: string
}

const DECISION_META: Record<DictamenDecision, DecisionMeta> = {
  approved: {
    Icon: CheckCircle2,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  rejected: {
    Icon: XCircle,
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  observed: {
    Icon: MinusCircle,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
}

export default async function DictamenesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { user, profile } = await requireAnyRole([
    "analyst",
    "admin",
    "officer",
  ])
  const supabase = await createClient()
  const params = await searchParams
  const activeTab = (params.tab === "emitidos" ? "emitidos" : "pendientes") as
    | "pendientes"
    | "emitidos"

  // ===== Pendientes: legajos en análisis crediticio sin dictamen todavía =====
  const { data: rawPendientes } = await supabase
    .from("applications")
    .select(
      `
        id,
        application_number,
        status,
        funding_line,
        submitted_at,
        created_at,
        requested_amount,
        sent_to_analyst_at,
        client:clients!inner(id, legal_name, cuit)
      `
    )
    .in("status", ["in_risk_analysis", "observed"])
    .order("sent_to_analyst_at", { ascending: true, nullsFirst: false })

  const pendientes = (rawPendientes ?? []).map((a) => {
    const client = Array.isArray(a.client) ? a.client[0] : a.client
    return {
      id: a.id,
      application_number: a.application_number,
      status: a.status as ApplicationStatus,
      funding_line: a.funding_line as FundingLine | null,
      requested_amount: a.requested_amount,
      sent_to_analyst_at: a.sent_to_analyst_at ?? a.submitted_at ?? a.created_at,
      client: client ?? null,
    }
  })

  // ===== Emitidos: dictámenes firmados (filtra por analista si aplica) =====
  let emitidosQuery = supabase
    .from("dictamenes")
    .select(
      `
        id,
        decision,
        approved_amount,
        justification,
        created_at,
        edit_count,
        last_edited_at,
        analyst_id,
        application:applications!inner(
          id,
          application_number,
          client:clients!inner(legal_name, cuit)
        )
      `
    )
    .order("created_at", { ascending: false })

  if (profile.role === "analyst") {
    emitidosQuery = emitidosQuery.eq("analyst_id", user.id)
  }

  const { data: rawEmitidos } = await emitidosQuery

  const emitidos = (rawEmitidos ?? []).map((d) => {
    const app = Array.isArray(d.application) ? d.application[0] : d.application
    const appClient = app
      ? Array.isArray(app.client)
        ? app.client[0]
        : app.client
      : null
    return {
      id: d.id,
      decision: d.decision as DictamenDecision,
      approved_amount: d.approved_amount,
      justification: d.justification,
      created_at: d.created_at,
      edit_count: d.edit_count ?? 0,
      last_edited_at: d.last_edited_at,
      application: app
        ? {
            id: app.id,
            application_number: app.application_number,
            client: appClient,
          }
        : null,
    }
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center gap-3">
        <ClipboardCheck className="h-7 w-7 text-[#1b38e8]" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dictámenes</h1>
          <p className="text-sm text-gray-500">
            {profile.role === "analyst"
              ? "Tu bitácora de análisis crediticio"
              : "Dictámenes del equipo"}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <DictamenesTabs
        activeTab={activeTab}
        pendientesCount={pendientes.length}
        emitidosCount={emitidos.length}
      />

      {/* Content */}
      {activeTab === "pendientes" ? (
        <PendientesSection items={pendientes} />
      ) : (
        <EmitidosSection items={emitidos} isAnalyst={profile.role === "analyst"} />
      )}
    </div>
  )
}

// ============================================================
// PENDIENTES
// ============================================================

function PendientesSection({
  items,
}: {
  items: Array<{
    id: string
    application_number: string
    status: ApplicationStatus
    funding_line: FundingLine | null
    requested_amount: number | null
    sent_to_analyst_at: string
    client: { id: string; legal_name: string; cuit: string } | null
  }>
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900">
          No hay legajos pendientes de dictamen
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Cuando un oficial envíe un legajo a análisis crediticio, va a aparecer acá.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
      {items.map((app) => {
        const daysInAnalysis = daysSince(app.sent_to_analyst_at)
        const isUrgent = daysInAnalysis > 7

        return (
          <Link
            key={app.id}
            href={`/staff/legajo/${app.id}`}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
          >
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
                {isUrgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200">
                    <AlertCircle className="h-3 w-3" />
                    {daysInAnalysis} días en análisis
                  </span>
                )}
              </div>
              <h3 className="mt-1 font-semibold text-gray-900 text-sm truncate">
                {app.client?.legal_name ?? "(Sin empresa)"}
              </h3>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {app.client && (
                  <span className="font-mono">CUIT {app.client.cuit}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {daysInAnalysis === 0
                    ? "Recibido hoy"
                    : `Hace ${daysInAnalysis} día${daysInAnalysis === 1 ? "" : "s"}`}
                </span>
                {app.requested_amount != null && (
                  <span className="font-medium text-gray-700">
                    Solicita {formatARS(Number(app.requested_amount))}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
          </Link>
        )
      })}
    </div>
  )
}

// ============================================================
// EMITIDOS
// ============================================================

function EmitidosSection({
  items,
  isAnalyst,
}: {
  items: Array<{
    id: string
    decision: DictamenDecision
    approved_amount: number | null
    justification: string
    created_at: string
    edit_count: number
    last_edited_at: string | null
    application: {
      id: string
      application_number: string
      client: { legal_name: string; cuit: string } | null
    } | null
  }>
  isAnalyst: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900">
          {isAnalyst
            ? "Todavía no emitiste ningún dictamen"
            : "No hay dictámenes emitidos"}
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Cuando se emita un dictamen, va a quedar registrado acá.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
      {items.map((d) => {
        const decisionMeta = DECISION_META[d.decision]
        const DecisionIcon = decisionMeta.Icon
        return (
          <Link
            key={d.id}
            href={
              d.application
                ? `/staff/legajo/${d.application.id}`
                : "#"
            }
            className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors"
          >
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${decisionMeta.bg}`}
            >
              <DecisionIcon className={`h-5 w-5 ${decisionMeta.text}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                {d.application && (
                  <p className="font-mono font-semibold text-sm text-gray-900">
                    {d.application.application_number}
                  </p>
                )}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${decisionMeta.bg} ${decisionMeta.text} ${decisionMeta.border}`}
                >
                  {DICTAMEN_DECISION_LABELS[d.decision]}
                </span>
                {d.edit_count > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-600 bg-gray-100 border border-gray-200">
                    Editado {d.edit_count}x
                  </span>
                )}
              </div>

              <h3 className="mt-1 font-semibold text-gray-900 text-sm truncate">
                {d.application?.client?.legal_name ?? "(Cliente)"}
              </h3>

              <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {d.application?.client && (
                  <span className="font-mono">
                    CUIT {d.application.client.cuit}
                  </span>
                )}
                <span>
                  Emitido{" "}
                  {new Date(d.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {d.approved_amount != null && d.decision === "approved" && (
                  <span className="font-medium text-gray-700">
                    Aprobado {formatARS(Number(d.approved_amount))}
                  </span>
                )}
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 mt-3" />
          </Link>
        )
      })}
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

function daysSince(dateStr: string): number {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}
