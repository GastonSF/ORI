import Link from "next/link"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  APPLICATION_STATUS_LABELS, CLIENT_TYPE_LABELS, isFinalStatus,
  canClientCancel, getStatusBucket, type ApplicationStatus,
} from "@/lib/constants/roles"
import {
  ArrowLeft, CheckCircle2, XCircle, MessageSquare, Mail, Phone, MapPin,
  Building, FileText, ArrowRight,
} from "lucide-react"
import { CancelApplicationButton } from "@/components/cliente/cancel-application-button"
import { ApplicationTimeline } from "@/components/cliente/application-timeline"
import { EditContactDialog } from "@/components/cliente/edit-contact-dialog"

export default async function ClientApplicationPage() {
  const { user } = await requireRole("client")
  const supabase = await createClient()

  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, cuit, client_type, onboarding_completed, onboarding_step, contact_email, contact_phone, fiscal_address, city, province, postal_code")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) return (
    <EmptyState title="Todavía no tenés perfil de empresa"
      message="Completá tu onboarding para poder iniciar una solicitud."
      ctaHref="/cliente/onboarding" ctaLabel="Ir al onboarding" />
  )

  const { data: app } = await supabase
    .from("applications").select("*").eq("client_id", client.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle()

  if (!app) return (
    <EmptyState title="No iniciaste ninguna solicitud todavía"
      message={client.onboarding_completed
        ? "Creá una nueva solicitud para pedir un crédito."
        : "Completá tu onboarding antes de crear una solicitud."}
      ctaHref={client.onboarding_completed ? "/cliente/solicitud/nueva" : "/cliente/onboarding"}
      ctaLabel={client.onboarding_completed ? "Nueva solicitud" : "Ir al onboarding"} />
  )

  const { data: publicComments } = await supabase
    .from("comments")
    .select("id, body, created_at, profiles:author_id(full_name, role)")
    .eq("application_id", app.id).eq("is_internal", false)
    .order("created_at", { ascending: false }).limit(10)

  const { data: dictamen } = (app.status === "approved" || app.status === "rejected_by_analyst")
    ? await supabase.from("dictamenes")
        .select("decision, approved_amount, term_months, interest_rate, conditions, created_at")
        .eq("application_id", app.id).maybeSingle()
    : { data: null }

  const status = app.status as ApplicationStatus
  const bucket = getStatusBucket(status)
  const clientCanCancel = canClientCancel(status)
  const hasComments = publicComments && publicComments.length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/cliente" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al panel
      </Link>

      {/* 1. HEADER + TIMELINE */}
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Solicitud de crédito</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              Legajo <span className="font-mono text-gray-700">{app.application_number}</span>
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {client.legal_name} · Creada el {formatDate(app.created_at)}
            </p>
          </div>
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {APPLICATION_STATUS_LABELS[status]}
          </span>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <ApplicationTimeline status={status} />
        </div>
      </header>

      {/* 2. MENSAJES DE WORCAP */}
      {hasComments && (
        <section className={`rounded-xl border p-6 ${
          bucket === "docs_requested" ? "border-amber-200 bg-amber-50" : "border-blue-100 bg-blue-50/40"
        }`}>
          <h2 className={`font-semibold flex items-center gap-2 mb-4 ${
            bucket === "docs_requested" ? "text-amber-900" : "text-gray-900"
          }`}>
            <MessageSquare className="h-4 w-4" /> Mensajes de WORCAP
          </h2>
          <ul className="space-y-3">
            {publicComments.map((c) => {
              const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
              return (
                <li key={c.id} className="rounded-lg border border-white/80 bg-white p-4 text-sm">
                  <p className="text-gray-800 whitespace-pre-line">{c.body}</p>
                  <p className="mt-3 text-xs text-gray-500">
                    {profile?.full_name ?? "Equipo WORCAP"} · {formatDate(c.created_at)}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 3. DICTAMEN */}
      {dictamen && (
        <section className={`rounded-xl border-2 p-6 ${
          dictamen.decision === "approved" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
        }`}>
          <div className="flex items-start gap-4">
            {dictamen.decision === "approved" ? (
              <div className="h-12 w-12 rounded-lg bg-green-600 grid place-items-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-red-600 grid place-items-center shrink-0">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h2 className={`text-lg font-semibold ${dictamen.decision === "approved" ? "text-green-900" : "text-red-900"}`}>
                {dictamen.decision === "approved" ? "¡Tu solicitud fue aprobada!" : "Tu solicitud fue rechazada"}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">{formatDate(dictamen.created_at)}</p>
              {dictamen.decision === "approved" && (
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {dictamen.approved_amount && (
                    <div>
                      <dt className="text-gray-600 text-xs uppercase tracking-wider">Monto aprobado</dt>
                      <dd className="mt-1 font-semibold text-gray-900 text-base">
                        {formatCurrency(Number(dictamen.approved_amount))}
                      </dd>
                    </div>
                  )}
                  {dictamen.term_months && (
                    <div>
                      <dt className="text-gray-600 text-xs uppercase tracking-wider">Plazo</dt>
                      <dd className="mt-1 font-semibold text-gray-900 text-base">{dictamen.term_months} meses</dd>
                    </div>
                  )}
                  {dictamen.interest_rate != null && (
                    <div>
                      <dt className="text-gray-600 text-xs uppercase tracking-wider">TNA</dt>
                      <dd className="mt-1 font-semibold text-gray-900 text-base">
                        {Number(dictamen.interest_rate).toFixed(2)}%
                      </dd>
                    </div>
                  )}
                </dl>
              )}
              {dictamen.conditions && (
                <div className="mt-4 pt-3 border-t border-gray-200/50">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Condiciones</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{dictamen.conditions}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. LO QUE PEDISTE */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Lo que pediste</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {app.requested_amount ? (
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Monto solicitado</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(Number(app.requested_amount))}
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Monto solicitado</dt>
              <dd className="mt-1 text-sm text-gray-400 italic">No especificado</dd>
            </div>
          )}
          {app.requested_term_months ? (
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Plazo</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {app.requested_term_months} <span className="text-sm font-normal text-gray-600">meses</span>
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Plazo</dt>
              <dd className="mt-1 text-sm text-gray-400 italic">No especificado</dd>
            </div>
          )}
          {app.submitted_at && (
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Enviada</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(app.submitted_at)}</dd>
            </div>
          )}
        </dl>
        {app.purpose && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destino del crédito</dt>
            <dd className="text-sm text-gray-900 whitespace-pre-line">{app.purpose}</dd>
          </div>
        )}
        {!dictamen && (
          <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            Los términos finales (monto aprobado, tasa, condiciones) pueden variar tras el análisis.
            Los verás acá cuando haya decisión.
          </p>
        )}
      </section>

      {/* 5. DATOS DE LA EMPRESA */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Datos de tu empresa</h2>
          <EditContactDialog initial={{
            contact_email: client.contact_email,
            contact_phone: client.contact_phone,
            fiscal_address: client.fiscal_address,
            city: client.city,
            province: client.province,
            postal_code: client.postal_code,
          }} />
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <dt className="text-xs text-gray-500 flex items-center gap-1">
              <Building className="h-3 w-3" /> Razón social
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{client.legal_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">CUIT</dt>
            <dd className="mt-1 text-sm font-mono font-medium text-gray-900">{client.cuit}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Tipo</dt>
            <dd className="mt-1 text-sm text-gray-900">{CLIENT_TYPE_LABELS[client.client_type]}</dd>
          </div>
        </dl>
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Email de contacto</p>
              <p className="text-gray-900">{client.contact_email}</p>
            </div>
          </div>
          {client.contact_phone && (
            <div className="flex items-start gap-3 text-sm">
              <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Teléfono</p>
                <p className="text-gray-900">{client.contact_phone}</p>
              </div>
            </div>
          )}
          {(client.fiscal_address || client.city) && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Domicilio fiscal</p>
                <p className="text-gray-900">
                  {[client.fiscal_address, client.city, client.province, client.postal_code]
                    .filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. ACCIONES */}
      {!isFinalStatus(status) && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Acciones</h2>
          <Link href="/cliente/documentos"
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm hover:bg-gray-50 hover:border-gray-300 transition">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-blue-50 text-[#1b38e8] grid place-items-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Ver documentación</p>
                <p className="text-xs text-gray-500 mt-0.5">Consultá los archivos cargados en tu legajo</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
        </section>
      )}

      {/* 7. CANCELAR */}
      {clientCanCancel && (
        <div className="pt-2 flex justify-end">
          <CancelApplicationButton applicationId={app.id} />
        </div>
      )}
    </div>
  )
}

function EmptyState({ title, message, ctaHref, ctaLabel }: {
  title: string; message: string; ctaHref: string; ctaLabel: string
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/cliente" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-5">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al panel
      </Link>
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <div className="inline-flex h-14 w-14 rounded-full bg-blue-50 items-center justify-center mb-4">
          <FileText className="h-7 w-7 text-[#1b38e8]" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{message}</p>
        <Link href={ctaHref}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1730c4]">
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
