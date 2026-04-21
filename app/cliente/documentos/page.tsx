import Link from "next/link"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  ArrowLeft,
  Building2,
  Send,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react"
import {
  REQUIRED_DOCS_BY_CLIENT_TYPE,
  DOCUMENT_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  isFinalStatus,
  getStatusBucket,
  type DocumentType,
  type ApplicationStatus,
} from "@/lib/constants/roles"
import { DocumentRow } from "@/components/cliente/document-row"
import { SubmitApplicationButton } from "@/components/cliente/submit-application-button"

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
        message="Primero necesitás completar el onboarding con los datos de tu empresa. Es rápido y podés guardar y continuar cuando quieras."
        href="/cliente/onboarding"
        label="Iniciar onboarding"
      />
    )
  }

  // Buscar legajo activo
  const { data: app } = await supabase
    .from("applications")
    .select("id, application_number, status, submitted_at")
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
          message={`Estás en el paso ${client.onboarding_step} de 5. Completalo para poder iniciar una solicitud y cargar documentación.`}
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

  const requiredDocs = REQUIRED_DOCS_BY_CLIENT_TYPE[client.client_type]

  const { data: documents } = await supabase
    .from("documents")
    .select(
      "id, document_type, file_name, file_size_bytes, mime_type, status, review_notes, uploaded_at"
    )
    .eq("application_id", app.id)
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
  const progressPct = Math.round((completedCount / totalCount) * 100)

  const status = app.status as ApplicationStatus
  const bucket = getStatusBucket(status)
  const canSubmit = (status === "draft" || status === "docs_requested") && allCompleted
  const isEditable = status === "draft" || status === "docs_requested"
  const isReadOnly = !isEditable

  const rejectedDocs = documents?.filter(
    (d) => d.status === "rejected" && d.review_notes
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb / Back */}
      <Link
        href="/cliente"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al panel
      </Link>

      {/* HEADER CON CONTEXTO */}
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Documentación
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

        {/* Barra de progreso */}
        <div className="mt-5">
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
        </div>
      </header>

      {/* BANNER DE CONTEXTO SEGÚN ESTADO */}
      {bucket === "docs_requested" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                WORCAP te pidió documentación adicional
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Un oficial revisó tu solicitud y necesita que actualices o
                agregues algunos documentos. Revisá los mensajes del oficial en
                la sección de &quot;Mi solicitud&quot; para saber exactamente
                qué necesitan.
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
                Ya enviaste esta documentación a WORCAP y está en revisión.
                Podés consultarla pero no modificarla mientras está en este
                estado. Si necesitás cambiar algo, contactá a tu oficial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTOS OBSERVADOS (si hay) */}
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

      {/* LISTA DE DOCUMENTOS */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Documentos requeridos
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isEditable
                ? "Subí los archivos en PDF, imagen (JPG/PNG) o Word/Excel. Máximo 25 MB por archivo."
                : "Archivos ya cargados en tu legajo."}
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {requiredDocs.map((type) => (
            <DocumentRow
              key={type}
              docType={type as DocumentType}
              label={DOCUMENT_TYPE_LABELS[type as DocumentType]}
              applicationId={app.id}
              clientId={client.id}
              existingDoc={docsMap[type] ?? null}
              readOnly={isReadOnly}
            />
          ))}
        </ul>
      </section>

      {/* ENVIAR AL OFICIAL */}
      {canSubmit && (
        <section className="rounded-xl border-2 border-[#1b38e8] bg-[#1b38e8]/5 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#1b38e8] grid place-items-center shrink-0">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Listo para enviar
              </h3>
              <p className="mt-1 text-sm text-gray-700">
                Ya cargaste los {totalCount} documentos requeridos. Cuando lo
                envíes, un oficial de WORCAP va a empezar a revisar tu
                solicitud.
              </p>
              <div className="mt-4">
                <SubmitApplicationButton applicationId={app.id} />
              </div>
            </div>
          </div>
        </section>
      )}

      {!allCompleted && isEditable && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 grid place-items-center shrink-0">
              <FileText className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                Cuando tengas <strong>los {totalCount} documentos</strong>{" "}
                cargados, vas a poder enviar tu solicitud al oficial para que la
                revise.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Te faltan {totalCount - completedCount}{" "}
                {totalCount - completedCount === 1 ? "documento" : "documentos"}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estado: finalizado (aprobado/rechazado) */}
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
    </div>
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
