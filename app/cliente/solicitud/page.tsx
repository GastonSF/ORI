import Link from "next/link"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  APPLICATION_STATUS_LABELS,
  isFinalStatus,
  canClientCancel,
  type ApplicationStatus,
} from "@/lib/constants/roles"
import { ArrowLeft, FileText, Clock, CheckCircle2, XCircle, MessageSquare } from "lucide-react"
import { CancelApplicationButton } from "@/components/cliente/cancel-application-button"

export default async function ClientApplicationPage() {
  const { user } = await requireRole("client")
  const supabase = await createClient()

  // Traer el cliente del usuario
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, onboarding_completed")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          title="Todavía no tenés perfil de empresa"
          message="Completá tu onboarding para poder iniciar una solicitud."
          ctaHref="/cliente/onboarding"
          ctaLabel="Ir al onboarding"
        />
      </div>
    )
  }

  // Buscar la application más reciente (activa o histórica)
  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!app) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          title="No iniciaste ninguna solicitud todavía"
          message={
            client.onboarding_completed
              ? "Creá una nueva solicitud para pedir un crédito."
              : "Completá tu onboarding antes de crear una solicitud."
          }
          ctaHref={
            client.onboarding_completed ? "/cliente/solicitud/nueva" : "/cliente/onboarding"
          }
          ctaLabel={client.onboarding_completed ? "Nueva solicitud" : "Ir al onboarding"}
        />
      </div>
    )
  }

  // Comentarios públicos del oficial (is_internal=false) visibles al cliente
  const { data: publicComments } = await supabase
    .from("comments")
    .select("id, body, created_at, profiles:author_id(full_name, role)")
    .eq("application_id", app.id)
    .eq("is_internal", false)
    .order("created_at", { ascending: false })
    .limit(10)

  // Dictamen final (si está aprobado o rechazado por analista)
  const { data: dictamen } =
    app.status === "approved" || app.status === "rejected_by_analyst"
      ? await supabase
          .from("dictamenes")
          .select("decision, approved_amount, term_months, interest_rate, conditions, created_at")
          .eq("application_id", app.id)
          .maybeSingle()
      : { data: null }

  const status = app.status as ApplicationStatus
  const clientCanCancel = canClientCancel(status)

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
        <h1 className="text-2xl font-semibold text-gray-900">
          Legajo <span className="font-mono">{app.application_number}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600">{client.legal_name}</p>
      </header>

      {/* Estado */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Estado actual</p>
            <StatusBadge status={status} />
          </div>
          {clientCanCancel && <CancelApplicationButton applicationId={app.id} />}
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {app.requested_amount && (
            <div>
              <dt className="text-gray-500">Monto solicitado</dt>
              <dd className="font-medium text-gray-900 mt-1">
                {formatCurrency(Number(app.requested_amount))}
              </dd>
            </div>
          )}
          {app.requested_term_months && (
            <div>
              <dt className="text-gray-500">Plazo</dt>
              <dd className="font-medium text-gray-900 mt-1">
                {app.requested_term_months} meses
              </dd>
            </div>
          )}
          {app.submitted_at && (
            <div>
              <dt className="text-gray-500">Enviado</dt>
              <dd className="font-medium text-gray-900 mt-1">
                {formatDate(app.submitted_at)}
              </dd>
            </div>
          )}
        </dl>

        {app.purpose && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destino</dt>
            <dd className="text-sm text-gray-900">{app.purpose}</dd>
          </div>
        )}
      </div>

      {/* Dictamen */}
      {dictamen && (
        <div
          className={`rounded-lg border p-6 mb-4 ${
            dictamen.decision === "approved"
              ? "border-green-200 bg-green-50/50"
              : "border-red-200 bg-red-50/50"
          }`}
        >
          <div className="flex items-start gap-3">
            {dictamen.decision === "approved" ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">
                {dictamen.decision === "approved"
                  ? "Solicitud aprobada"
                  : "Solicitud rechazada"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(dictamen.created_at)}
              </p>

              {dictamen.decision === "approved" && (
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {dictamen.approved_amount && (
                    <div>
                      <dt className="text-gray-500 text-xs">Monto aprobado</dt>
                      <dd className="font-medium text-gray-900">
                        {formatCurrency(Number(dictamen.approved_amount))}
                      </dd>
                    </div>
                  )}
                  {dictamen.term_months && (
                    <div>
                      <dt className="text-gray-500 text-xs">Plazo</dt>
                      <dd className="font-medium text-gray-900">{dictamen.term_months} meses</dd>
                    </div>
                  )}
                  {dictamen.interest_rate != null && (
                    <div>
                      <dt className="text-gray-500 text-xs">TNA</dt>
                      <dd className="font-medium text-gray-900">
                        {Number(dictamen.interest_rate).toFixed(2)}%
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {dictamen.conditions && (
                <div className="mt-4 pt-3 border-t border-gray-200/50">
                  <p className="text-xs text-gray-500 mb-1">Condiciones</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {dictamen.conditions}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comentarios públicos */}
      {publicComments && publicComments.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-500" />
            Mensajes del oficial
          </h2>
          <ul className="mt-4 space-y-4">
            {publicComments.map((c) => {
              const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
              return (
                <li
                  key={c.id}
                  className="rounded-md border border-gray-100 bg-gray-50/50 p-3 text-sm"
                >
                  <p className="text-gray-800 whitespace-pre-line">{c.body}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {profile?.full_name ?? "WORCAP"} · {formatDate(c.created_at)}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Accesos rápidos */}
      {!isFinalStatus(status) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Acciones</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/cliente/documentos"
              className="flex items-start gap-3 rounded-md border border-gray-200 p-4 hover:border-gray-400 transition"
            >
              <FileText className="h-5 w-5 text-[#1b38e8] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 text-sm">Documentación</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Revisá o actualizá los documentos de tu legajo
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {isFinalStatus(status) && (
        <div className="mt-6">
          <Link
            href="/cliente/solicitud/nueva"
            className="inline-flex items-center gap-2 rounded-md bg-[#1b38e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1730c4]"
          >
            Iniciar nueva solicitud
          </Link>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const tone =
    status === "approved"
      ? "bg-green-50 text-green-700"
      : status === "rejected_by_officer" || status === "rejected_by_analyst"
        ? "bg-red-50 text-red-700"
        : status === "cancelled_by_client" || status === "cancelled_by_worcap"
          ? "bg-gray-100 text-gray-700"
          : "bg-blue-50 text-[#1b38e8]"
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${tone}`}>
      <Clock className="inline-block h-3.5 w-3.5 mr-1.5 -mt-0.5" />
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  )
}

function EmptyState({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string
  message: string
  ctaHref: string
  ctaLabel: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
      <FileText className="h-10 w-10 text-gray-300 mx-auto" />
      <h2 className="mt-3 font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{message}</p>
      <Link
        href={ctaHref}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4]"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}
