import Link from "next/link"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, Send } from "lucide-react"
import {
  REQUIRED_DOCS_BY_CLIENT_TYPE,
  DOCUMENT_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  isFinalStatus,
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
    .select("id, legal_name, client_type, onboarding_completed")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) {
    return (
      <Empty href="/cliente/onboarding" label="Completá tu onboarding primero">
        Todavía no tenés un perfil de empresa cargado.
      </Empty>
    )
  }

  // Buscar la application activa
  const { data: app } = await supabase
    .from("applications")
    .select("id, application_number, status")
    .eq("client_id", client.id)
    .not(
      "status",
      "in",
      `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`
    )
    .maybeSingle()

  if (!app) {
    return (
      <Empty
        href={client.onboarding_completed ? "/cliente/solicitud/nueva" : "/cliente/onboarding"}
        label={client.onboarding_completed ? "Nueva solicitud" : "Completar onboarding"}
      >
        {client.onboarding_completed
          ? "No tenés un legajo activo. Creá una nueva solicitud para cargar documentación."
          : "Completá tu onboarding antes de cargar documentación."}
      </Empty>
    )
  }

  const requiredDocs = REQUIRED_DOCS_BY_CLIENT_TYPE[client.client_type]

  const { data: documents } = await supabase
    .from("documents")
    .select("id, document_type, file_name, file_size_bytes, status, review_notes, uploaded_at")
    .eq("application_id", app.id)
    .order("uploaded_at", { ascending: false })

  const docsMap: Record<string, (typeof documents)[number] | null> = {}
  if (documents) {
    for (const d of documents) {
      if (!docsMap[d.document_type]) docsMap[d.document_type] = d
    }
  }

  const completedCount = requiredDocs.filter((t) => docsMap[t]).length
  const allCompleted = completedCount === requiredDocs.length
  const status = app.status as ApplicationStatus
  const canSubmit = (status === "draft" || status === "docs_requested") && allCompleted

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <Link
          href="/cliente"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al panel
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Documentación</h1>
        <p className="mt-1 text-sm text-gray-600">
          Legajo <span className="font-mono">{app.application_number}</span> ·{" "}
          <span className="text-[#1b38e8] font-medium">
            {APPLICATION_STATUS_LABELS[status]}
          </span>
        </p>
      </header>

      <div className="rounded-md border border-blue-100 bg-blue-50/50 p-4 text-sm text-gray-700 mb-4 flex items-center justify-between">
        <span>
          <strong className="text-[#1b38e8]">{completedCount}</strong> de{" "}
          <strong>{requiredDocs.length}</strong> documentos subidos
        </span>
        {!isFinalStatus(status) && (
          <span className="text-xs text-gray-500">Máximo 25 MB por archivo</span>
        )}
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
          />
        ))}
      </ul>

      {/* Notas de revisión si el oficial pidió cambios */}
      {documents?.some((d) => d.status === "rejected" && d.review_notes) && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900 text-sm">Documentos observados</h3>
          <ul className="mt-2 space-y-2 text-sm text-red-800">
            {documents
              .filter((d) => d.status === "rejected" && d.review_notes)
              .map((d) => (
                <li key={d.id}>
                  <strong>{DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]}:</strong>{" "}
                  {d.review_notes}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Botón enviar al oficial */}
      {canSubmit && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50/50 p-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">¡Todo listo!</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Ya podés enviar tu legajo al oficial para que lo revise.
            </p>
          </div>
          <SubmitApplicationButton applicationId={app.id} />
        </div>
      )}

      {!allCompleted && !isFinalStatus(status) && (
        <p className="mt-6 text-xs text-gray-500 text-center">
          Cuando subas todos los documentos requeridos vas a poder enviar el legajo al
          oficial.
        </p>
      )}
    </div>
  )
}

function Empty({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
        <p className="text-sm text-gray-600">{children}</p>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4]"
        >
          {label}
        </Link>
      </div>
    </div>
  )
}
