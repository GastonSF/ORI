import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAnyRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, Building2, History } from "lucide-react"
import {
  APPLICATION_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  FUNDING_LINE_LABELS,
  type ApplicationStatus,
  type ClientType,
  type FundingLine,
  type DictamenDecision,
  type UserRole,
  type CollectionChannel,
  type DebitoTipo,
  type CollectionCodeOwnership,
} from "@/lib/constants/roles"
import { LegajoDocumentosPanel } from "@/components/staff/legajo-documentos-panel"
import { LegajoDictamenForm } from "@/components/staff/legajo-dictamen-form"
import { LegajoAssignmentButton } from "@/components/staff/legajo-assignment-button"
import { LegajoAdvanceButton } from "@/components/staff/legajo-advance-button"
import { LegajoCobranzaPanel } from "@/components/staff/legajo-cobranza-panel"
import { LegajoApproveInfoButton } from "@/components/staff/legajo-approve-info-button"

type Params = { id: string }

const STORAGE_BUCKET = "documents"

// Estados "de análisis inicial" donde tiene sentido mostrar el botón de avance
const INITIAL_ANALYSIS_STATUSES: ApplicationStatus[] = [
  "submitted",
  "pending_authorization",
  "authorized",
  "docs_in_review",
]

// Estados donde tiene sentido mostrar el panel del árbol de cobranza FGPlus.
// Desde additional_docs_pending el oficial puede ir viendo lo que sube el
// cliente en tiempo real. Una vez en review, el panel sigue visible.
const COBRANZA_PANEL_STATUSES: ApplicationStatus[] = [
  "additional_docs_pending",
  "additional_docs_review",
  "in_risk_analysis",
  "observed",
  "approved",
  "rejected_by_analyst",
]

// Cuántos docs se piden para cada línea (para el preview del modal)
const DOCS_COUNT_BY_LINE: Record<FundingLine, number> = {
  fgplus: 3,
  financing_general: 3,
}

export default async function LegajoDetallePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { user, profile } = await requireAnyRole(["officer", "analyst", "admin"])
  const { id } = await params
  const supabase = await createClient()

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
        assigned_officer_id,
        assigned_officer:profiles!applications_assigned_officer_id_fkey(full_name),
        client:clients!inner(
          id,
          legal_name,
          cuit,
          client_type
        )
      `
    )
    .eq("id", id)
    .single()

  if (error || !rawApp) notFound()

  const client = Array.isArray(rawApp.client) ? rawApp.client[0] : rawApp.client
  if (!client) notFound()

  const assignedOfficer = Array.isArray(rawApp.assigned_officer)
    ? rawApp.assigned_officer[0]
    : rawApp.assigned_officer

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
    assigned_officer_id: rawApp.assigned_officer_id,
    assigned_officer_name: assignedOfficer?.full_name ?? null,
  }

  const { data: rawDocs } = await supabase
    .from("documents")
    .select(
      `
        id,
        file_name,
        file_size_bytes,
        document_type,
        doc_phase,
        status,
        uploaded_at,
        created_at,
        uploaded_on_behalf_by_staff,
        review_notes,
        reviewed_at,
        reviewed_by,
        reviewer:profiles!documents_reviewed_by_fkey(full_name)
      `
    )
    .eq("application_id", id)
    .order("created_at", { ascending: true })

  const { data: rawAddlReqs } = await supabase
    .from("additional_document_requests")
    .select(
      "id, document_name, description, is_required, status, fulfilled_by_document_id"
    )
    .eq("application_id", id)

  const documents = (rawDocs ?? []).map((d) => {
    const reviewer = Array.isArray(d.reviewer) ? d.reviewer[0] : d.reviewer
    return {
      id: d.id,
      file_name: d.file_name,
      file_size_bytes: d.file_size_bytes,
      document_type: d.document_type as string,
      doc_phase: d.doc_phase as "initial" | "additional",
      status: d.status as "pending" | "uploaded" | "approved" | "rejected",
      uploaded_at: d.uploaded_at,
      uploaded_on_behalf_by_staff: !!d.uploaded_on_behalf_by_staff,
      review_notes: d.review_notes as string | null,
      reviewed_at: d.reviewed_at as string | null,
      reviewed_by_name: (reviewer?.full_name ?? null) as string | null,
    }
  })

  const additionalRequests = (rawAddlReqs ?? []).map((r) => ({
    id: r.id,
    document_name: r.document_name,
    description: r.description,
    is_required: r.is_required,
    status: r.status as string,
    fulfilled_by_document_id: r.fulfilled_by_document_id,
  }))

  const { data: existingDictamen } = await supabase
    .from("dictamenes")
    .select(
      "id, decision, approved_amount, term_months, interest_rate, conditions, observations, justification, analyst_id, created_at, edit_count, last_edited_at, last_edited_by"
    )
    .eq("application_id", id)
    .maybeSingle()

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

  // ============================================================
  // Cargar el árbol de cobranza si es FGPlus y está en una fase relevante
  // ============================================================
  let cobranzaData: {
    channels: CollectionChannel[]
    debitoTipos: DebitoTipo[]
    completedAt: string | null
    codes: Array<{
      id: string
      code_name: string
      ownership: CollectionCodeOwnership
      cedente_nivel_1_name: string | null
      cedente_nivel_2_name: string | null
      is_excluded: boolean
      exclusion_reason: string | null
      docs: {
        autorizacion_descuento: { id: string; file_name: string; file_size_bytes: number | null; signed_url: string | null } | null
        convenio_nivel_1: { id: string; file_name: string; file_size_bytes: number | null; signed_url: string | null } | null
        convenio_nivel_2: { id: string; file_name: string; file_size_bytes: number | null; signed_url: string | null } | null
        autorizacion_mutual_original: { id: string; file_name: string; file_size_bytes: number | null; signed_url: string | null } | null
      }
    }>
  } | null = null

  const showCobranzaPanel =
    app.funding_line === "fgplus" &&
    COBRANZA_PANEL_STATUSES.includes(app.status)

  if (showCobranzaPanel) {
    const { data: tree } = await supabase
      .from("funding_line_responses")
      .select("channels, debito_tipos, completed_at")
      .eq("application_id", app.id)
      .maybeSingle()

    const { data: rawCodes } = await supabase
      .from("collection_codes")
      .select(
        `
          id,
          code_name,
          ownership,
          cedente_nivel_1_name,
          cedente_nivel_2_name,
          is_excluded,
          exclusion_reason,
          autorizacion_descuento_doc_id,
          convenio_nivel_1_doc_id,
          convenio_nivel_2_doc_id,
          autorizacion_mutual_original_doc_id,
          created_at
        `
      )
      .eq("application_id", app.id)
      .order("created_at", { ascending: true })

    const codes = rawCodes ?? []

    // Recolectar todos los doc_ids para cargarlos en una sola query
    const allDocIds: string[] = []
    for (const c of codes) {
      if (c.autorizacion_descuento_doc_id) allDocIds.push(c.autorizacion_descuento_doc_id)
      if (c.convenio_nivel_1_doc_id) allDocIds.push(c.convenio_nivel_1_doc_id)
      if (c.convenio_nivel_2_doc_id) allDocIds.push(c.convenio_nivel_2_doc_id)
      if (c.autorizacion_mutual_original_doc_id) allDocIds.push(c.autorizacion_mutual_original_doc_id)
    }

    const docsById = new Map<string, { id: string; file_name: string; file_size_bytes: number | null; signed_url: string | null }>()

    if (allDocIds.length > 0) {
      const { data: docsData } = await supabase
        .from("documents")
        .select("id, file_name, file_size_bytes, file_path")
        .in("id", allDocIds)

      // Generar signed URLs (válidas por 1 hora) para cada doc
      for (const d of docsData ?? []) {
        let signedUrl: string | null = null
        if (d.file_path) {
          const { data: signed } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(d.file_path, 3600)
          signedUrl = signed?.signedUrl ?? null
        }
        docsById.set(d.id, {
          id: d.id,
          file_name: d.file_name,
          file_size_bytes: d.file_size_bytes,
          signed_url: signedUrl,
        })
      }
    }

    cobranzaData = {
      channels: (tree?.channels ?? []) as CollectionChannel[],
      debitoTipos: (tree?.debito_tipos ?? []) as DebitoTipo[],
      completedAt: tree?.completed_at ?? null,
      codes: codes.map((c) => ({
        id: c.id,
        code_name: c.code_name,
        ownership: c.ownership as CollectionCodeOwnership,
        cedente_nivel_1_name: c.cedente_nivel_1_name,
        cedente_nivel_2_name: c.cedente_nivel_2_name,
        is_excluded: c.is_excluded,
        exclusion_reason: c.exclusion_reason,
        docs: {
          autorizacion_descuento: c.autorizacion_descuento_doc_id
            ? docsById.get(c.autorizacion_descuento_doc_id) ?? null
            : null,
          convenio_nivel_1: c.convenio_nivel_1_doc_id
            ? docsById.get(c.convenio_nivel_1_doc_id) ?? null
            : null,
          convenio_nivel_2: c.convenio_nivel_2_doc_id
            ? docsById.get(c.convenio_nivel_2_doc_id) ?? null
            : null,
          autorizacion_mutual_original: c.autorizacion_mutual_original_doc_id
            ? docsById.get(c.autorizacion_mutual_original_doc_id) ?? null
            : null,
        },
      })),
    }
  }

  const isDictaminable =
    app.status === "in_risk_analysis" || app.status === "observed"
  const isAnalystOrAdmin =
    profile.role === "analyst" || profile.role === "admin"
  const showDictamenForm =
    isAnalystOrAdmin && (isDictaminable || !!existingDictamen)

  const canActOnDocs =
    profile.role === "admin" ||
    (profile.role === "officer" && app.assigned_officer_id === user.id)

  // ============================================================
  // ¿Mostrar el botón "Pedir docs de línea"?
  // ============================================================
  const initialDocs = documents.filter((d) => d.doc_phase === "initial")
  const allInitialDocsApproved =
    initialDocs.length > 0 && initialDocs.every((d) => d.status === "approved")

  const showAdvanceButton =
    canActOnDocs &&
    INITIAL_ANALYSIS_STATUSES.includes(app.status) &&
    app.funding_line !== null &&
    allInitialDocsApproved &&
    additionalRequests.length === 0

  const previewDocsCount = app.funding_line
    ? DOCS_COUNT_BY_LINE[app.funding_line]
    : 0

  // ============================================================
  // ¿Mostrar el botón "Aprobar pedido de información"?
  // ============================================================
  // Condiciones:
  //  - Usuario puede actuar (officer asignado o admin)
  //  - Status = additional_docs_review (cliente ya envió formalmente)
  //  - Línea es FGPlus (solo FGPlus tiene este flujo)
  const showApproveInfoButton =
    canActOnDocs &&
    app.status === "additional_docs_review" &&
    app.funding_line === "fgplus"

  // Resumen del árbol para el modal de aprobación
  const cobranzaCanales = cobranzaData?.channels.length ?? 0
  const cobranzaCodigosTotal = cobranzaData?.codes.length ?? 0
  const cobranzaCodigosExcluidos =
    cobranzaData?.codes.filter((c) => c.is_excluded).length ?? 0
  const cobranzaCodigosCompletos = cobranzaCodigosTotal - cobranzaCodigosExcluidos

  // ¿Hay algo que mostrar en la columna derecha?
  const hasRightColumn =
    showDictamenForm ||
    history.length > 0 ||
    showAdvanceButton ||
    showApproveInfoButton

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
              {app.funding_line ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-700 bg-gray-100 border border-gray-200">
                  {FUNDING_LINE_LABELS[app.funding_line]}
                </span>
              ) : null}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              {client.legal_name}
            </h1>
            <div className="mt-0.5 flex items-center gap-2 flex-wrap text-sm text-gray-500">
              <span className="font-mono">CUIT {client.cuit}</span>
              <span className="text-gray-300">·</span>
              <span>{CLIENT_TYPE_LABELS[client.client_type as ClientType]}</span>
              {app.requested_amount != null ? (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="font-mono font-medium text-gray-700">
                    {formatARS(Number(app.requested_amount))} solicitados
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            <LegajoAssignmentButton
              applicationId={app.id}
              applicationNumber={app.application_number}
              assignedOfficerId={app.assigned_officer_id}
              assignedOfficerName={app.assigned_officer_name}
              currentUserId={user.id}
              currentUserRole={profile.role as UserRole as "officer" | "admin" | "analyst"}
            />
          </div>
        </div>
      </header>

      {/* Grid principal: adaptativo según si hay columna derecha o no */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`${hasRightColumn ? "lg:col-span-9" : "lg:col-span-12"} space-y-4`}>
          <LegajoDocumentosPanel
            documents={documents}
            additionalRequests={additionalRequests}
            applicationId={app.id}
            applicationNumber={app.application_number}
            clientType={client.client_type as ClientType}
            clientId={client.id}
            canUploadAsStaff={canActOnDocs}
            canReviewDocs={canActOnDocs}
          />

          {/* Panel de árbol de cobranza (solo FGPlus) */}
          {showCobranzaPanel && cobranzaData ? (
            <LegajoCobranzaPanel
              applicationNumber={app.application_number}
              channels={cobranzaData.channels}
              debitoTipos={cobranzaData.debitoTipos}
              codes={cobranzaData.codes}
              completedAt={cobranzaData.completedAt}
            />
          ) : null}
        </div>

        {hasRightColumn ? (
          <div className="lg:col-span-3 space-y-4">
            {/* Botón de avance a docs de línea (acción principal cuando aplica) */}
            {showAdvanceButton && app.funding_line ? (
              <LegajoAdvanceButton
                applicationId={app.id}
                applicationNumber={app.application_number}
                fundingLine={app.funding_line}
                previewDocsCount={previewDocsCount}
              />
            ) : null}

            {/* Botón de aprobación del pedido de información (acción principal cuando aplica) */}
            {showApproveInfoButton ? (
              <LegajoApproveInfoButton
                applicationId={app.id}
                applicationNumber={app.application_number}
                cobranzaCanales={cobranzaCanales}
                cobranzaCodigosCompletos={cobranzaCodigosCompletos}
                cobranzaCodigosExcluidos={cobranzaCodigosExcluidos}
                cobranzaCodigosTotal={cobranzaCodigosTotal}
              />
            ) : null}

            {showDictamenForm ? (
              <LegajoDictamenForm
                applicationId={app.id}
                existingDictamen={existingDictamen ?? null}
                applicationStatus={app.status}
              />
            ) : null}

            {history.length > 0 ? (
              <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-gray-500" />
                  <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Historial ({history.length})
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
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

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
