import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth/session"
import {
  APPLICATION_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  isFinalStatus,
} from "@/lib/constants/roles"
import { ArrowRight, FileText, Building2, Upload } from "lucide-react"

export default async function ClientDashboard() {
  const { user, profile } = await requireRole("client")
  const supabase = await createClient()

  // Traer el cliente (empresa) del usuario si existe. Puede no existir aún
  // si recién se registró y no arrancó el onboarding.
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  // Si tiene cliente, buscar su legajo activo
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

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          ¡Hola, {profile.full_name.split(" ")[0]}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Desde acá gestionás tu solicitud de crédito en WORCAP.
        </p>
      </header>

      {/* CASO 1: Sin perfil de empresa cargado aún */}
      {!client && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-md bg-blue-50 text-[#1b38e8] grid place-items-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                Empezá por tu onboarding
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Completá los datos de tu empresa para poder iniciar una solicitud de crédito.
                Es un proceso de 5 pasos y podés guardar y continuar cuando quieras.
              </p>
              <Link
                href="/cliente/onboarding"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4]"
              >
                Iniciar onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CASO 2: Con empresa cargada */}
      {client && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Card de empresa */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tu empresa</p>
            <h2 className="text-lg font-semibold text-gray-900">{client.legal_name}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">CUIT</dt>
                <dd className="font-mono text-gray-900">{client.cuit}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Tipo</dt>
                <dd className="text-gray-900">{CLIENT_TYPE_LABELS[client.client_type]}</dd>
              </div>
              {!client.onboarding_completed && (
                <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  Tu onboarding está en el paso {client.onboarding_step} de 5.{" "}
                  <Link href="/cliente/onboarding" className="underline font-medium">
                    Continuar
                  </Link>
                </div>
              )}
            </dl>
          </div>

          {/* Card de legajo activo */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Solicitud actual
            </p>
            {activeApp ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900">
                  Legajo {activeApp.application_number}
                </h2>
                <div className="mt-3 inline-block rounded-full bg-blue-50 text-[#1b38e8] px-2.5 py-1 text-xs font-medium">
                  {APPLICATION_STATUS_LABELS[activeApp.status]}
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  {activeApp.requested_amount && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Monto solicitado</dt>
                      <dd className="text-gray-900">
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          maximumFractionDigits: 0,
                        }).format(Number(activeApp.requested_amount))}
                      </dd>
                    </div>
                  )}
                </dl>
                <Link
                  href="/cliente/solicitud"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#1b38e8] hover:underline"
                >
                  Ver detalle
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  {client.onboarding_completed
                    ? "Todavía no iniciaste una solicitud."
                    : "Completá tu onboarding para iniciar una solicitud."}
                </p>
                {client.onboarding_completed && (
                  <Link
                    href="/cliente/solicitud/nueva"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1730c4]"
                  >
                    <FileText className="h-4 w-4" />
                    Nueva solicitud
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Card de documentación */}
          {activeApp && !isFinalStatus(activeApp.status) && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 md:col-span-2">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-md bg-blue-50 text-[#1b38e8] grid place-items-center shrink-0">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Documentación</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Subí los documentos requeridos para avanzar con tu solicitud.
                  </p>
                  <Link
                    href="/cliente/documentos"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1b38e8] hover:underline"
                  >
                    Ir a documentación
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
