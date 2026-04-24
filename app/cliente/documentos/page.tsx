import Link from "next/link"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  ArrowLeft,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  GitBranch,
  ChevronDown,
} from "lucide-react"
import {
  REQUIRED_DOCS_BY_CLIENT_TYPE,
  DOCUMENT_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  FUNDING_LINE_LABELS,
  isFinalStatus,
  getStatusBucket,
  type DocumentType,
  type ApplicationStatus,
  type FundingLine,
} from "@/lib/constants/roles"
import { DocumentRow } from "@/components/cliente/document-row"
import { AdditionalDocumentRow } from "@/components/cliente/additional-document-row"

type DocByIdEntry = {
  id: string
  file_name: string
  file_size_bytes: number | null
}

export default async function ClientDocumentsPage() {
  const { user } = await requireRole("client")
  const supabase = await createClient()

  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, client_type, onboarding_completed, onboarding_step")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) {
    return (
      <Empty
        icon={Building2}
        title="Todavía no cargaste tu empresa"
        message="Primero necesitás completar el onboarding con los datos de tu empresa."
        href="/cliente/onboarding"
        label="Iniciar onboarding"
      />
    )
  }

  const { data: app } = await supabase
    .from("applications")
    .select("id, application_number, status, submitted_at, funding_line")
    .eq("client_id", client.id)
    .not(
      "status",
      "in",
      `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`
    )
    .maybeSingle()

  if (!app) {
    if (!client.onboarding_completed) {
      return (
        <Empty
          icon={Building2}
          title="Terminá tu onboarding primero"
          message={`Estás en el paso ${client.onboarding_step} de 6. Completalo para enviar tu solicitud.`}
          href="/cliente/onboarding"
          label="Continuar onboarding"
        />
      )
    }
    return (
      <Empty
        icon={FileText}
        title="No tenés una solicitud activa"
        message="Creá una nueva solicitud de crédito para cargar documentación."
        href="/cliente/solicitud/nueva"
        label="Nueva solicitud"
      />
    )
  }

  const status = app.status as ApplicationStatus
  const bucket = getStatusBucket(status)
  const fundingLine = app.funding_line as FundingLine | null

  const isAdditionalPhase =
    fundingLine !== null &&
    (bucket === "additional_docs_pending" ||
      bucket === "additional_docs_review" ||
      bucket === "in_credit_analysis" ||
      bucket === "approved" ||
      bucket === "rejected")

  if (bucket === "awaiting_funding_line_choice") {
    // Bucket deprecado en el flujo nuevo, lo dejamos como fallback
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <Link
          href="/cliente"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al panel
        </Link>

        <div className="rounded-xl border-2 border-[#1b38e8] bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#1b38e8] grid place-items-center shrink-0">
              <GitBranch className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                Primero elegí tu línea de fondeo
              </h2>
              <p className="mt-1 text-sm text-gray-700">
                Tu documentación inicial ya fue aprobada. Ahora elegí tu línea
                de fondeo para que podamos pedirte la documentación específica
                que corresponda.
              </p>
              <Link
                href="/cliente/eleccion-linea"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4]"
              >
                Elegir línea →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link
        href="/cliente"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al panel
      </Link>

      {/* HEADER */}
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Documentación{" "}
              {isAdditionalPhase && fundingLine && (
                <span className="text-[#1b38e8]">
                  · {FUNDING_LINE_LABELS[fundingLine]}
                </span>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              Legajo{" "}
              <span className="font-mono text-gray-700">
                {app.application_number}
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {client.legal_name} · {CLIENT_TYPE_LABELS[client.client_type]}
            </p>
          </div>
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {APPLICATION_STATUS_LABELS[status]}
          </span>
        </div>
      </header>

      {isAdditionalPhase ? (
        <AdditionalPhaseContent
          appId={app.id}
          fundingLine={fundingLine!}
          status={status}
          bucket={bucket}
        />
      ) : (
        <InitialPhaseContent
          appId={app.id}
          clientId={client.id}
          clientType={client.client_type}
          status={status}
          bucket={bucket}
        />
      )}
    </div>
  )
}

// ============================================================
// FASE INICIAL: docs según tipo de cliente
// ============================================================

async function InitialPhaseContent({
  appId,
  clientId,
  clientType,
  status,
  bucket,
}: {
  appId: string
  clientId: string
  clientType: keyof typeof REQUIRED_DOCS_BY_CLIENT_TYPE
  status: ApplicationStatus
  bucket: ReturnType<typeof getStatusBucket>
}) {
  const supabase = await createClient()
  const requiredDocs = REQUIRED_DOCS_BY_CLIENT_TYPE[clientType]

  const { data: documents } = await supabase
    .from("documents")
    .select(
      "id, document_type, file_name, file_size_bytes, mime_type, status, review_notes, uploaded_at"
    )
    .eq("application_id", appId)
    .eq("doc_phase", "initial")
    .order("uploaded_at", { ascending: false })

  const docsMap: Record<string, (typeof documents)[number] | null> = {}
  if (documents) {
    for (const d of documents) {
      if (!docsMap[d.document_type]) docsMap[d.document_type] = d
    }
  }

  const completedCount = requiredDocs.filter((t) => docsMap[t]).length
  const totalCount = requiredDocs.length
  const allCompleted = completedCount === totalCount
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // En el flujo nuevo el legajo nunca queda en draft desde documentos
  // (se envía al finalizar el onboarding). Solo queda editable si el oficial
  // pidió más docs (docs_requested).
  const isEditable = status === "docs_requested"
  const isReadOnly = !isEditable

  const rejectedDocs = documents?.filter(
    (d) => d.status === "rejected" && d.review_notes
  )

  return (
    <>
      {/* Progreso */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">
              {completedCount} de {totalCount}
            </span>{" "}
            documentos subidos
          </span>
          <span
            className={`font-semibold ${
              allCompleted ? "text-green-700" : "text-[#1b38e8]"
            }`}
          >
            {progressPct}%
          </span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              allCompleted ? "bg-green-600" : "bg-[#1b38e8]"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* Banners */}
      {bucket === "docs_requested" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                WORCAP te pidió documentación adicional
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Revisá los mensajes del oficial en &quot;Mi solicitud&quot; para
                ver qué falta.
              </p>
              <Link
                href="/cliente/solicitud"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 hover:underline"
              >
                Ver mensajes del oficial →
              </Link>
            </div>
          </div>
        </div>
      )}

      {isReadOnly && bucket !== "docs_requested" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Documentación enviada
              </h3>
              <p className="mt-1 text-sm text-gray-700">
                Tu solicitud está con WORCAP. Podés consultar la documentación
                pero no modificarla mientras está en revisión.
              </p>
            </div>
          </div>
        </div>
      )}

      {rejectedDocs && rejectedDocs.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-900 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Documentos con observaciones
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-red-800">
            {rejectedDocs.map((d) => (
              <li key={d.id}>
                <strong>
                  {DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]}:
                </strong>{" "}
                {d.review_notes}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Documentos requeridos
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {isEditable
              ? "PDF, imagen (JPG/PNG) o Word/Excel. Máximo 25 MB por archivo."
              : "Archivos cargados en tu legajo."}
          </p>
        </div>
        <ul className="space-y-2">
          {requiredDocs.map((type) => (
            <DocumentRow
              key={type}
              docType={type as DocumentType}
              label={DOCUMENT_TYPE_LABELS[type as DocumentType]}
              applicationId={appId}
              clientId={clientId}
              existingDoc={docsMap[type] ?? null}
              readOnly={isReadOnly}
            />
          ))}
        </ul>
      </section>
    </>
  )
}

// ============================================================
// FASE ADICIONAL: docs según línea elegida
// ============================================================

async function AdditionalPhaseContent({
  appId,
  fundingLine,
  status,
  bucket,
}: {
  appId: string
  fundingLine: FundingLine
  status: ApplicationStatus
  bucket: ReturnType<typeof getStatusBucket>
}) {
  const supabase = await createClient()

  const { data: requests } = await supabase
    .from("additional_document_requests")
    .select(
      "id, document_name, description, is_required, status, review_notes, fulfilled_by_document_id"
    )
    .eq("application_id", appId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })

  const docIds = (requests ?? [])
    .map((r) => r.fulfilled_by_document_id)
    .filter((id): id is string => id !== null)

  const { data: docs } =
    docIds.length > 0
      ? await supabase
          .from("documents")
          .select("id, file_name, file_size_bytes")
          .in("id", docIds)
      : { data: [] }

  const docsById: Record<string, DocByIdEntry> = {}
  for (const d of docs ?? []) {
    docsById[d.id] = d
  }

  const allRequests = requests ?? []
  const requiredRequests = allRequests.filter((r) => r.is_required)
  const fulfilledRequired = requiredRequests.filter(
    (r) => r.status === "fulfilled" || r.status === "approved"
  )
  const totalRequired = requiredRequests.length
  const completedCount = fulfilledRequired.length
  const allCompleted = totalRequired > 0 && completedCount === totalRequired
  const progressPct = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0

  const isEditable = status === "additional_docs_pending"
  const isReadOnly = !isEditable

  return (
    <>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <GitBranch className="h-5 w-5 text-[#1b38e8] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Línea elegida: {FUNDING_LINE_LABELS[fundingLine]}
            </p>
            <p className="mt-0.5 text-xs text-gray-700">
              Estos son los documentos específicos que necesitamos para
              continuar con tu solicitud.
            </p>
          </div>
        </div>
      </div>

      {totalRequired > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">
                {completedCount} de {totalRequired}
              </span>{" "}
              documentos requeridos subidos
            </span>
            <span
              className={`font-semibold ${
                allCompleted ? "text-green-700" : "text-[#1b38e8]"
              }`}
            >
              {progressPct}%
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                allCompleted ? "bg-green-600" : "bg-[#1b38e8]"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>
      )}

      {bucket === "additional_docs_review" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Documentación enviada
              </h3>
              <p className="mt-1 text-sm text-gray-700">
                Tu documentación adicional ya está siendo revisada por el
                analista. Si necesitamos algo más, te avisaremos.
              </p>
            </div>
          </div>
        </div>
      )}

      {allRequests.length > 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Documentación adicional
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isEditable
                ? "PDF, imagen, Word o Excel. Máximo 25 MB por archivo."
                : "Archivos cargados para esta línea."}
            </p>
          </div>
          <ul className="space-y-2">
            {allRequests.map((req) => (
              <AdditionalDocumentRow
                key={req.id}
                request={req}
                applicationId={appId}
                existingDoc={
                  req.fulfilled_by_document_id
                    ? docsById[req.fulfilled_by_document_id] ?? null
                    : null
                }
                readOnly={isReadOnly}
              />
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            WORCAP todavía no te pidió documentación adicional para esta línea.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Te avisaremos en cuanto el analista la cargue.
          </p>
        </section>
      )}

      <details className="rounded-xl border border-gray-200 bg-white p-4 group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Documentación inicial (ya revisada)
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-600 mb-3">
            Esta documentación ya fue revisada y aprobada en la etapa anterior.
            Queda como referencia.
          </p>
          <InitialDocsArchive appId={appId} />
        </div>
      </details>

      {isFinalStatus(status) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900">
                Documentación archivada
              </h3>
              <p className="mt-1 text-sm text-gray-700">
                Esta solicitud ya finalizó. La documentación queda registrada
                como consulta.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

async function InitialDocsArchive({ appId }: { appId: string }) {
  const supabase = await createClient()
  const { data: docs } = await supabase
    .from("documents")
    .select("id, document_type, file_name, file_size_bytes, status")
    .eq("application_id", appId)
    .eq("doc_phase", "initial")
    .order("uploaded_at", { ascending: false })

  if (!docs || docs.length === 0) {
    return <p className="text-xs text-gray-500 italic">Sin documentos iniciales.</p>
  }

  return (
    <ul className="space-y-1.5">
      {docs.map((d) => (
        <li
          key={d.id}
          className="flex items-center gap-2 text-xs text-gray-700 py-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
          <span className="font-medium">
            {DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]}:
          </span>
          <span className="text-gray-500 font-mono truncate">{d.file_name}</span>
        </li>
      ))}
    </ul>
  )
}

function Empty({
  icon: Icon,
  title,
  message,
  href,
  label,
}: {
  icon: React.ElementType
  title: string
  message: string
  href: string
  label: string
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/cliente"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al panel
      </Link>
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <div className="inline-flex h-14 w-14 rounded-full bg-blue-50 items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-[#1b38e8]" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{message}</p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1730c4]"
        >
          {label}
        </Link>
      </div>
    </div>
  )
}
