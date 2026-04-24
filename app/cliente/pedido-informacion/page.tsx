import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  ArrowLeft,
  Package,
  FileText,
  Coins,
  Send,
} from "lucide-react"
import {
  APPLICATION_STATUS_LABELS,
  FUNDING_LINE_LABELS,
  type ApplicationStatus,
  type FundingLine,
} from "@/lib/constants/roles"
import { PedidoInfoCard } from "@/components/cliente/pedido-info-card"

/**
 * Página índice del "Pedido de información" para el cliente.
 *
 * Solo aplica cuando:
 *   - El legajo está en estado 'additional_docs_pending' o 'additional_docs_review'
 *   - La línea es FGPlus (solo FGPlus tiene árbol + cartera multi-Excel)
 *
 * Si la línea es Financiamiento General, redirigimos a /cliente/documentos
 * (el flujo viejo simple de 3 docs sueltos).
 */
export default async function PedidoInformacionPage() {
  const { user } = await requireRole("client")
  const supabase = await createClient()

  // Traer el cliente + su legajo activo
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) {
    redirect("/cliente/onboarding")
  }

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, application_number, status, funding_line, info_request_completed_at"
    )
    .eq("client_id", client.id)
    .in("status", ["additional_docs_pending", "additional_docs_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!app) {
    // No tiene legajo en esta fase, redirigir al dashboard
    redirect("/cliente")
  }

  const fundingLine = app.funding_line as FundingLine | null
  if (fundingLine !== "fgplus") {
    // Para Financiamiento General usamos el flujo viejo
    redirect("/cliente/documentos")
  }

  const applicationStatus = app.status as ApplicationStatus
  const isReadOnly = applicationStatus === "additional_docs_review"

  // ============================================================
  // Traer los requests de cartera y política
  // ============================================================
  const { data: requests } = await supabase
    .from("additional_document_requests")
    .select(
      "id, document_name, is_required, status, fulfilled_by_document_id"
    )
    .eq("application_id", app.id)
    .order("requested_at", { ascending: true })

  const carteraRequests = (requests ?? []).filter((r) =>
    r.document_name.startsWith("Cartera")
  )
  const politicaOriginacionRequest = (requests ?? []).find(
    (r) => r.document_name === "Política de originación"
  )

  // Estado de composición de cartera
  const carteraSubidos = carteraRequests.filter(
    (r) => r.status === "fulfilled" || r.status === "approved"
  ).length
  const carteraRequeridos = carteraRequests.filter((r) => r.is_required).length
  const carteraRechazados = carteraRequests.filter(
    (r) => r.status === "rejected"
  ).length

  let carteraState: "pending" | "in_progress" | "complete" | "rejected"
  if (carteraRechazados > 0) {
    carteraState = "rejected"
  } else if (carteraSubidos === 0) {
    carteraState = "pending"
  } else if (carteraSubidos >= carteraRequeridos) {
    carteraState = "complete"
  } else {
    carteraState = "in_progress"
  }

  const carteraProgress =
    carteraSubidos === 0
      ? "Sin empezar"
      : `${carteraSubidos} archivo${carteraSubidos !== 1 ? "s" : ""} subido${
          carteraSubidos !== 1 ? "s" : ""
        } de ${carteraRequeridos} sugerido${carteraRequeridos !== 1 ? "s" : ""}`

  // Estado de política de originación
  let polOrigState: "pending" | "in_progress" | "complete" | "rejected" = "pending"
  let polOrigProgress = "Sin empezar"
  if (politicaOriginacionRequest) {
    switch (politicaOriginacionRequest.status) {
      case "rejected":
        polOrigState = "rejected"
        polOrigProgress = "El documento fue rechazado, subilo de nuevo"
        break
      case "approved":
        polOrigState = "complete"
        polOrigProgress = "Aprobada por WORCAP"
        break
      case "fulfilled":
        polOrigState = "complete"
        polOrigProgress = "Documento subido"
        break
      default:
        polOrigState = "pending"
        polOrigProgress = "Sin subir"
    }
  }

  // ============================================================
  // Estado de política de cobranza (árbol)
  // ============================================================
  const { data: tree } = await supabase
    .from("funding_line_responses")
    .select("id, channels, debito_tipos, completed_at")
    .eq("application_id", app.id)
    .maybeSingle()

  const { data: codes } = await supabase
    .from("collection_codes")
    .select("id, is_excluded")
    .eq("application_id", app.id)

  let cobranzaState: "pending" | "in_progress" | "complete" | "rejected" = "pending"
  let cobranzaProgress = "Sin empezar"

  if (tree) {
    const channelsCount = tree.channels?.length ?? 0
    const codesCount = codes?.length ?? 0

    if (tree.completed_at) {
      cobranzaState = "complete"
      cobranzaProgress = "Enviada a WORCAP"
    } else if (channelsCount === 0) {
      cobranzaState = "pending"
      cobranzaProgress = "Sin empezar"
    } else {
      cobranzaState = "in_progress"
      if (codesCount > 0) {
        cobranzaProgress = `${channelsCount} canal${
          channelsCount !== 1 ? "es" : ""
        } · ${codesCount} código${codesCount !== 1 ? "s" : ""} cargado${
          codesCount !== 1 ? "s" : ""
        }`
      } else {
        cobranzaProgress = `${channelsCount} canal${
          channelsCount !== 1 ? "es" : ""
        } seleccionado${channelsCount !== 1 ? "s" : ""}`
      }
    }
  }

  // ============================================================
  // ¿Todo listo para enviar?
  // ============================================================
  const allReady =
    carteraState === "complete" &&
    polOrigState === "complete" &&
    cobranzaState === "complete"

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/cliente"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1b38e8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>
      </div>

      {/* Header */}
      <header className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-mono text-xs font-semibold text-gray-600">
            {app.application_number}
          </p>
          <span className="text-gray-300">·</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-[#1b38e8] bg-[#eff3ff] border border-blue-200">
            {APPLICATION_STATUS_LABELS[applicationStatus]}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-700 bg-gray-100 border border-gray-200">
            {FUNDING_LINE_LABELS[fundingLine]}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          Pedido de información
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {isReadOnly
            ? "Ya enviaste el pedido a WORCAP. Lo estamos revisando."
            : "Te pedimos 3 cosas para poder analizar tu cartera. Podés completar en el orden que quieras y guardar para seguir después."}
        </p>
      </header>

      {/* 3 tarjetas */}
      <div className="space-y-3">
        <PedidoInfoCard
          stepNumber={1}
          title="Composición de cartera"
          description="Subí los Excel con la información de tus créditos activos."
          progressText={carteraProgress}
          state={carteraState}
          href={`/cliente/pedido-informacion/cartera`}
          disabled={isReadOnly}
        />
        <PedidoInfoCard
          stepNumber={2}
          title="Política de originación"
          description="Un documento que describa cómo prestás (criterios, montos, plazos)."
          progressText={polOrigProgress}
          state={polOrigState}
          href={`/cliente/pedido-informacion/politica-originacion`}
          disabled={isReadOnly}
        />
        <PedidoInfoCard
          stepNumber={3}
          title="Política de cobranza"
          description="Canales de cobranza, códigos de descuento y autorizaciones."
          progressText={cobranzaProgress}
          state={cobranzaState}
          href={`/cliente/pedido-informacion/politica-cobranza`}
          disabled={isReadOnly}
        />
      </div>

      {/* Botón "Enviar todo" */}
      {!isReadOnly ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#eff3ff] grid place-items-center shrink-0">
              <Send className="h-5 w-5 text-[#1b38e8]" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">
                Enviar el pedido a WORCAP
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {allReady
                  ? "Completaste todo. Revisá y enviá para que el oficial haga la verificación económico-financiera."
                  : "Tenés que completar las 3 secciones antes de poder enviar."}
              </p>
              <button
                type="button"
                disabled={!allReady}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                Enviar pedido de información
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
