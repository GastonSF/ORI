import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  ArrowLeft,
  Send,
  CheckCircle2,
} from "lucide-react"
import {
  APPLICATION_STATUS_LABELS,
  FUNDING_LINE_LABELS,
  type ApplicationStatus,
  type FundingLine,
  type CollectionChannel,
  type DebitoTipo,
  type CollectionCodeOwnership,
} from "@/lib/constants/roles"
import { PedidoInfoCard } from "@/components/cliente/pedido-info-card"
import { SubmitInfoRequestButton } from "@/components/cliente/submit-info-request-button"

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
    redirect("/cliente")
  }

  const fundingLine = app.funding_line as FundingLine | null
  if (fundingLine !== "fgplus") {
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

  // ============================================================
  // Estado de composición de cartera
  // ============================================================
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

  // ============================================================
  // Estado de política de originación
  // ============================================================
  let polOrigState: "pending" | "in_progress" | "complete" | "rejected" = "pending"
  let polOrigProgress = "Sin empezar"
  let politicaOriginacionOk = false
  if (politicaOriginacionRequest) {
    switch (politicaOriginacionRequest.status) {
      case "rejected":
        polOrigState = "rejected"
        polOrigProgress = "El documento fue rechazado, subilo de nuevo"
        break
      case "approved":
        polOrigState = "complete"
        polOrigProgress = "Aprobada por WORCAP"
        politicaOriginacionOk = true
        break
      case "fulfilled":
        polOrigState = "complete"
        polOrigProgress = "Documento subido"
        politicaOriginacionOk = true
        break
      default:
        polOrigState = "pending"
        polOrigProgress = "Sin subir"
    }
  }

  // ============================================================
  // Estado de política de cobranza (árbol completo con códigos)
  // ============================================================
  const { data: tree } = await supabase
    .from("funding_line_responses")
    .select("id, channels, debito_tipos, completed_at")
    .eq("application_id", app.id)
    .maybeSingle()

  // Cargar TODOS los datos de los códigos para validar completitud
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
        autorizacion_descuento_doc_id,
        convenio_nivel_1_doc_id,
        convenio_nivel_2_doc_id,
        autorizacion_mutual_original_doc_id
      `
    )
    .eq("application_id", app.id)

  const codes = rawCodes ?? []

  let cobranzaState: "pending" | "in_progress" | "complete" | "rejected" = "pending"
  let cobranzaProgress = "Sin empezar"

  // Datos para el resumen del modal de envío
  let cobranzaCanales = 0
  let cobranzaCodigosCompletos = 0
  let cobranzaCodigosExcluidos = 0
  let cobranzaCodigosTotal = 0

  if (tree) {
    const channels = (tree.channels ?? []) as CollectionChannel[]
    const debitoTipos = (tree.debito_tipos ?? []) as DebitoTipo[]
    const includesDescuento = channels.includes("descuento_haberes")
    const includesDebito = channels.includes("debito_cuenta")

    cobranzaCanales = channels.length
    cobranzaCodigosTotal = codes.length
    cobranzaCodigosExcluidos = codes.filter((c) => c.is_excluded).length
    cobranzaCodigosCompletos = codes.filter(
      (c) => !c.is_excluded && isCodeComplete(c)
    ).length

    if (channels.length === 0) {
      cobranzaState = "pending"
      cobranzaProgress = "Sin empezar"
    } else {
      // Validar todas las reglas de completitud
      const codesValidos = codes.map((c) => isCodeComplete(c))
      const codesIncompletos = codesValidos.filter((ok) => !ok).length
      const codesActivos = codes.filter((c) => !c.is_excluded).length
      const codesExcluidos = codes.filter((c) => c.is_excluded).length

      // 1. Si débito sin tipo → in_progress
      if (includesDebito && debitoTipos.length === 0) {
        cobranzaState = "in_progress"
        cobranzaProgress = pluralChannels(channels.length) + " · falta tipo de cuenta"
      }
      // 2. Si descuento sin códigos → in_progress
      else if (includesDescuento && codes.length === 0) {
        cobranzaState = "in_progress"
        cobranzaProgress = pluralChannels(channels.length) + " · falta cargar códigos"
      }
      // 3. Si descuento con códigos pero algunos incompletos → in_progress
      else if (includesDescuento && codesIncompletos > 0) {
        cobranzaState = "in_progress"
        const completos = codes.length - codesIncompletos
        cobranzaProgress = `${pluralChannels(channels.length)} · ${completos} de ${codes.length} códigos completos`
      }
      // 4. Todo OK → complete
      else {
        cobranzaState = "complete"
        if (includesDescuento && codes.length > 0) {
          if (codesExcluidos > 0 && codesActivos > 0) {
            cobranzaProgress = `${pluralChannels(channels.length)} · ${codesActivos} código${codesActivos !== 1 ? "s" : ""} listo${codesActivos !== 1 ? "s" : ""}, ${codesExcluidos} excluido${codesExcluidos !== 1 ? "s" : ""}`
          } else if (codesExcluidos > 0) {
            cobranzaProgress = `${pluralChannels(channels.length)} · ${codesExcluidos} código${codesExcluidos !== 1 ? "s" : ""} excluido${codesExcluidos !== 1 ? "s" : ""}`
          } else {
            cobranzaProgress = `${pluralChannels(channels.length)} · ${codes.length} código${codes.length !== 1 ? "s" : ""} listo${codes.length !== 1 ? "s" : ""}`
          }
        } else {
          cobranzaProgress = pluralChannels(channels.length) + " seleccionado" + (channels.length !== 1 ? "s" : "")
        }
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

      {/* Botón "Enviar todo" (solo si no está en read-only) */}
      {!isReadOnly && (
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
              <div className="mt-3">
                <SubmitInfoRequestButton
                  applicationId={app.id}
                  applicationNumber={app.application_number}
                  summary={{
                    carteraSubidos,
                    carteraSugeridos: carteraRequeridos,
                    politicaOriginacionOk,
                    cobranzaCanales,
                    cobranzaCodigosCompletos,
                    cobranzaCodigosExcluidos,
                    cobranzaCodigosTotal,
                  }}
                  disabled={!allReady}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Si está read-only (ya envió), mostrar confirmación */}
      {isReadOnly && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 grid place-items-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-emerald-900">
                Pedido enviado a WORCAP
              </h3>
              <p className="mt-1 text-sm text-emerald-800">
                Tu pedido está siendo revisado por el oficial. Te avisaremos
                por mail cuando tengamos novedades. Mientras tanto, podés
                consultar lo que cargaste navegando las 3 secciones.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Devuelve "1 canal" o "N canales" según corresponda.
 */
function pluralChannels(n: number): string {
  return n === 1 ? "1 canal" : `${n} canales`
}

/**
 * Replica la lógica de completitud de la card del código.
 * Excluido = completo a propósito.
 */
type RawCode = {
  code_name: string
  ownership: string
  cedente_nivel_1_name: string | null
  cedente_nivel_2_name: string | null
  is_excluded: boolean
  autorizacion_descuento_doc_id: string | null
  convenio_nivel_1_doc_id: string | null
  convenio_nivel_2_doc_id: string | null
  autorizacion_mutual_original_doc_id: string | null
}

function isCodeComplete(c: RawCode): boolean {
  if (c.is_excluded) return true
  if (!c.code_name?.trim()) return false

  const ownership = c.ownership as CollectionCodeOwnership
  switch (ownership) {
    case "propio":
      return !!c.autorizacion_descuento_doc_id
    case "tercero_directo":
      return (
        !!c.cedente_nivel_1_name?.trim() &&
        !!c.convenio_nivel_1_doc_id &&
        !!c.autorizacion_descuento_doc_id
      )
    case "tercero_sub_cedido":
      return (
        !!c.cedente_nivel_1_name?.trim() &&
        !!c.cedente_nivel_2_name?.trim() &&
        !!c.convenio_nivel_1_doc_id &&
        !!c.autorizacion_descuento_doc_id &&
        !!c.convenio_nivel_2_doc_id &&
        !!c.autorizacion_mutual_original_doc_id
      )
    default:
      return false
  }
}
