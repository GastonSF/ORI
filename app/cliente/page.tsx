import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import {
  CLIENT_TYPE_LABELS,
  REQUIRED_DOCS_BY_CLIENT_TYPE,
  APPLICATION_STATUS_LABELS,
  isFinalStatus,
} from "@/lib/constants/roles"
import { CheckCircle2 } from "lucide-react"
import { ProgressRing } from "@/components/shared/progress-ring"
import { DashboardHero } from "@/components/cliente/dashboard-hero"
import { ApplicationTimeline } from "@/components/cliente/application-timeline"

export default async function ClientDashboard() {
  const { user, profile } = await requireRole("client")
  const supabase = await createClient()

  const firstName = profile.full_name.split(" ")[0]

  // Traer el cliente (empresa) del usuario si existe
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  // Legajo activo (si hay cliente)
  const { data: activeApp } = client
    ? await supabase
        .from("applications")
        .select("*")
        .eq("client_id", client.id)
        .not("status", "in", `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  // Si no hay activo pero podría haber uno cerrado (aprobado/rechazado) reciente
  const { data: lastClosedApp } =
    client && !activeApp
      ? await supabase
          .from("applications")
          .select("*")
          .eq("client_id", client.id)
          .in(
            "status",
            ["approved", "rejected_by_officer", "rejected_by_analyst", "cancelled_by_client", "cancelled_by_worcap"]
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null }

  // Usamos el activo si existe, sino el último cerrado (para mostrar resultado)
  const displayedApp = activeApp ?? lastClosedApp

  // Conteo de documentos INICIALES
  const requiredDocs = client
    ? REQUIRED_DOCS_BY_CLIENT_TYPE[client.client_type] ?? []
    : []
  const totalDocsRequired = requiredDocs.length

  let uploadedDocsCount = 0
  if (displayedApp && requiredDocs.length > 0) {
    const { data: uploadedDocs } = await supabase
      .from("documents")
      .select("document_type")
      .eq("application_id", displayedApp.id)
      .eq("doc_phase", "initial")

    if (uploadedDocs) {
      const uniqueTypes = new Set(
        uploadedDocs
          .map((d) => d.document_type)
          .filter((t) => requiredDocs.includes(t))
      )
      uploadedDocsCount = uniqueTypes.size
    }
  }
  const docsPending = totalDocsRequired - uploadedDocsCount

  // Conteo de documentos ADICIONALES pendientes (fase 5)
  let additionalDocsPending = 0
  if (displayedApp) {
    const { data: addlRequests } = await supabase
      .from("additional_document_requests")
      .select("status")
      .eq("application_id", displayedApp.id)
      .eq("status", "pending")
      .eq("is_required", true)

    additionalDocsPending = addlRequests?.length ?? 0
  }

  // Progreso del onboarding
  const onboardingStep = client?.onboarding_completed
    ? 5
    : client?.onboarding_step ?? 0
  const totalOnboardingSteps = 5

  // ¿Los anillos están los dos al 100%? Si sí los colapsamos en una línea
  const onboardingDone = onboardingStep >= totalOnboardingSteps
  const docsDone = totalDocsRequired > 0 && uploadedDocsCount >= totalDocsRequired
  const bothComplete = onboardingDone && docsDone && client !== null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. TIMELINE - contexto primero (solo si hay legajo) */}
      {displayedApp && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Estado del legajo
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {displayedApp.application_number}
              </p>
            </div>
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {APPLICATION_STATUS_LABELS[displayedApp.status]}
            </span>
          </div>
          <ApplicationTimeline status={displayedApp.status} />
        </section>
      )}

      {/* 2. DATOS DE LA EMPRESA (solo si hay cliente) */}
      {client && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Tu empresa
            </p>
            {!client.onboarding_completed && (
              <Link
                href="/cliente/onboarding"
                className="text-xs font-medium text-[#1b38e8] hover:underline"
              >
                Continuar onboarding →
              </Link>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {client.legal_name}
          </h3>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">CUIT</dt>
              <dd className="mt-0.5 font-mono text-gray-900">{client.cuit}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Tipo</dt>
              <dd className="mt-0.5 text-gray-900">
                {CLIENT_TYPE_LABELS[client.client_type]}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Estado del perfil</dt>
              <dd className="mt-0.5 text-gray-900">
                {client.onboarding_completed ? "Completo" : `En paso ${client.onboarding_step} de 5`}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* 3. HERO - acción a tomar (después del contexto y los datos) */}
      <DashboardHero
        clientName={firstName}
        hasClient={!!client}
        onboardingCompleted={client?.onboarding_completed ?? false}
        onboardingStep={client?.onboarding_step ?? 0}
        activeApp={
          displayedApp
            ? {
                id: displayedApp.id,
                application_number: displayedApp.application_number,
                status: displayedApp.status,
                submitted_at: displayedApp.submitted_at,
              }
            : null
        }
        docsPending={docsPending}
        additionalDocsPending={additionalDocsPending}
      />

      {/* 4. PROGRESO - dos modos: completo (linea chica) o en curso (anillos) */}
      {client && displayedApp && !isFinalStatus(displayedApp.status) && (
        <>
          {bothComplete ? (
            /* Colapsado: línea chica de confirmación */
            <section className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0" />
                <p className="text-sm text-green-900">
                  <span className="font-semibold">
                    Onboarding y documentación completos.
                  </span>{" "}
                  Ya enviaste todo lo necesario.
                </p>
              </div>
            </section>
          ) : (
            /* Expandido: anillos */
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">
                Tu progreso
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex justify-center">
                  <ProgressRing
                    value={onboardingStep}
                    total={totalOnboardingSteps}
                    label="Onboarding"
                    sublabel={`${onboardingStep} de ${totalOnboardingSteps} pasos`}
                  />
                </div>
                <div className="flex justify-center">
                  <ProgressRing
                    value={uploadedDocsCount}
                    total={totalDocsRequired}
                    label="Documentación"
                    sublabel={
                      totalDocsRequired > 0
                        ? `${uploadedDocsCount} de ${totalDocsRequired} documentos`
                        : "Sin requisitos aún"
                    }
                  />
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
