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
} from "@/lib/constants/roles"
import { LegajoDocumentosPanel } from "@/components/staff/legajo-documentos-panel"
import { LegajoDictamenForm } from "@/components/staff/legajo-dictamen-form"
import { LegajoAssignmentButton } from "@/components/staff/legajo-assignment-button"

type Params = { id: string }

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
      "id, file_name, file_size_bytes, document_type, doc_phase, status, uploaded_at, created_at"
    )
    .eq("application_id", id)
    .order("created_at", { ascending: true })

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

  const { data: existingDictamen } = await supabase
    .from("dictamenes")
    .select(
      "id, decision, approved_amount, term_months, interest_rate, conditions, observations, justification, analyst_id, created_at, edit_count, last_edited_at, last_edited_by"
    )
    .eq("application_id", id)
    .maybeSingle()

  // Histórico del cliente
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

  const isDictaminable =
    app.status === "in_risk_analysis" || app.status === "observed"
  const isAnalystOrAdmin =
    profile.role === "analyst" || profile.role === "admin"
  const showDictame
