"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import {
  FGPLUS_PRESET_DOCS,
  FGPLUS_CARTERA_SLOTS,
  FINANCING_GENERAL_CHECKLIST,
  type FundingLine,
} from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

type AdvanceResult = ActionResult<{ requests_created: number }>

/**
 * Avanza un legajo desde "análisis inicial" a "Pedido de información".
 *
 * Lo llama el oficial cuando terminó de aprobar los docs iniciales.
 *
 * Para FGPlus crea:
 *   - N requests para los slots de composición de cartera (Excel sueltos)
 *   - 1 request para "Política de originación"
 *   - 1 fila vacía en funding_line_responses (para el árbol de cobranza)
 *
 * Para Financiamiento General crea:
 *   - 3 requests con los docs del checklist (aval, plan, flujo)
 *
 * Y en ambos casos:
 *   - Cambia el status del legajo a 'additional_docs_pending'
 *   - Deja el legajo en manos del cliente (current_owner_role = 'client')
 *
 * Reglas:
 *   - Solo oficial asignado o admin pueden ejecutarla
 *   - El legajo debe estar en análisis inicial
 *   - El legajo debe tener funding_line (no puede ser null)
 *   - Todos los docs iniciales requeridos deben estar aprobados
 */
export async function advanceToAdditionalDocsAction(input: {
  application_id: string
}): Promise<AdvanceResult> {
  if (!input.application_id) {
    return { ok: false, error: "Falta el ID del legajo" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar rol staff (officer o admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, full_name")
    .eq("id", user.id)
    .single()
  if (!profile || !profile.is_active) {
    return { ok: false, error: "Perfil inactivo" }
  }
  if (profile.role !== "officer" && profile.role !== "admin") {
    return {
      ok: false,
      error: "Solo un oficial o admin puede avanzar el legajo",
    }
  }

  // Traer el legajo con los datos necesarios
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select(
      "id, application_number, status, funding_line, assigned_officer_id, client_id"
    )
    .eq("id", input.application_id)
    .single()

  if (appErr || !app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  // Si es officer, tiene que ser el asignado
  if (profile.role === "officer" && app.assigned_officer_id !== user.id) {
    return {
      ok: false,
      error: "Tenés que estar asignado al legajo para avanzarlo",
    }
  }

  // Validar estado: debe estar en análisis inicial
  const validStatuses = [
    "submitted",
    "pending_authorization",
    "authorized",
    "docs_in_review",
  ]
  if (!validStatuses.includes(app.status)) {
    return {
      ok: false,
      error: `El legajo no está en análisis inicial (está en ${app.status}). No se puede avanzar.`,
    }
  }

  // Validar que tenga línea
  if (!app.funding_line) {
    return {
      ok: false,
      error: "El legajo no tiene línea definida. No se puede avanzar.",
    }
  }

  const fundingLine = app.funding_line as FundingLine

  // Validar que todos los docs iniciales estén aprobados
  const { data: initialDocs } = await supabase
    .from("documents")
    .select("id, document_type, status")
    .eq("application_id", app.id)
    .eq("doc_phase", "initial")

  if (!initialDocs || initialDocs.length === 0) {
    return {
      ok: false,
      error: "El legajo no tiene documentación inicial cargada",
    }
  }

  const hasUnapproved = initialDocs.some((d) => d.status !== "approved")
  if (hasUnapproved) {
    const pendingCount = initialDocs.filter((d) => d.status !== "approved").length
    return {
      ok: false,
      error: `Todavía hay ${pendingCount} documento(s) sin aprobar. Aprobá todos antes de avanzar.`,
    }
  }

  // Verificar que no haya requests ya creadas (para evitar duplicar al clickear 2 veces)
  const { count: existingRequestsCount } = await supabase
    .from("additional_document_requests")
    .select("id", { count: "exact", head: true })
    .eq("application_id", app.id)

  if (existingRequestsCount && existingRequestsCount > 0) {
    return {
      ok: false,
      error: "Este legajo ya tiene un pedido de información asignado.",
    }
  }

  const nowIso = new Date().toISOString()

  // ============================================================
  // Crear los requests según la línea
  // ============================================================
  const requestsToCreate = buildRequestsForLine(
    app.id,
    fundingLine,
    user.id,
    nowIso
  )

  const { error: reqErr } = await supabase
    .from("additional_document_requests")
    .insert(requestsToCreate)

  if (reqErr) {
    return {
      ok: false,
      error: `Error creando pedidos de docs: ${reqErr.message}`,
    }
  }

  // ============================================================
  // Solo FGPlus: crear fila vacía en funding_line_responses
  // para el árbol de política de cobranza
  // ============================================================
  if (fundingLine === "fgplus") {
    const { error: flrErr } = await supabase
      .from("funding_line_responses")
      .insert({
        application_id: app.id,
        channels: [],
        debito_tipos: [],
        completed_at: null,
      })

    if (flrErr) {
      // Rollback los requests creados
      await supabase
        .from("additional_document_requests")
        .delete()
        .eq("application_id", app.id)
        .eq("requested_by", user.id)
        .gte("requested_at", nowIso)
      return {
        ok: false,
        error: `Error creando el árbol de política de cobranza: ${flrErr.message}`,
      }
    }
  }

  // ============================================================
  // Cambiar el status del legajo
  // ============================================================
  const { error: updateErr } = await supabase
    .from("applications")
    .update({
      status: "additional_docs_pending",
      current_owner_role: "client",
      updated_at: nowIso,
    })
    .eq("id", app.id)

  if (updateErr) {
    // Rollback: borrar lo que ya creamos
    await supabase
      .from("additional_document_requests")
      .delete()
      .eq("application_id", app.id)
      .eq("requested_by", user.id)
      .gte("requested_at", nowIso)

    if (fundingLine === "fgplus") {
      await supabase
        .from("funding_line_responses")
        .delete()
        .eq("application_id", app.id)
    }

    return {
      ok: false,
      error: `Error avanzando el legajo: ${updateErr.message}`,
    }
  }

  // Audit log
  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "application_advanced_to_additional_docs",
    entity_type: "applications",
    entity_id: app.id,
    old_value: {
      previous_status: app.status,
    },
    new_value: {
      new_status: "additional_docs_pending",
      funding_line: fundingLine,
      requests_created: requestsToCreate.length,
      has_collection_tree: fundingLine === "fgplus",
      advanced_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  // Refrescar rutas
  revalidatePath(`/staff/legajo/${app.id}`)
  revalidatePath("/staff")
  revalidatePath("/staff/dictamenes")
  revalidatePath("/cliente")
  revalidatePath("/cliente/solicitud")
  revalidatePath("/cliente/documentos")
  revalidatePath("/cliente/pedido-informacion")

  return {
    ok: true,
    data: { requests_created: requestsToCreate.length },
  }
}

// ============================================================
// HELPERS
// ============================================================

type RequestRow = {
  application_id: string
  funding_line: FundingLine
  document_name: string
  description: string | null
  is_required: boolean
  is_preset: boolean
  status: "pending"
  requested_by: string
  requested_at: string
}

/**
 * Arma la lista de requests a insertar según la línea.
 *
 * FGPlus:
 *   - 5 slots de cartera (3 sugeridos + 2 vacíos extra). Los 3 sugeridos
 *     se crean con su label; los 2 extra se crean con nombre genérico
 *     para que el cliente los edite o los deje sin usar.
 *   - 1 doc suelto (Política de originación)
 *
 * Financiamiento General:
 *   - 3 docs del checklist
 */
function buildRequestsForLine(
  applicationId: string,
  line: FundingLine,
  requestedBy: string,
  requestedAt: string
): RequestRow[] {
  const rows: RequestRow[] = []

  if (line === "fgplus") {
    // Slots de cartera
    FGPLUS_CARTERA_SLOTS.forEach((slot, idx) => {
      const isSuggestedSlot = slot.suggested
      const name = isSuggestedSlot
        ? `Cartera — ${slot.label}`
        : `Cartera — Archivo extra ${idx - 2}`
      rows.push({
        application_id: applicationId,
        funding_line: line,
        document_name: name,
        description: slot.description,
        is_required: isSuggestedSlot,
        is_preset: true,
        status: "pending",
        requested_by: requestedBy,
        requested_at: requestedAt,
      })
    })

    // Política de originación (único doc suelto de FGPlus)
    FGPLUS_PRESET_DOCS.forEach((doc) => {
      rows.push({
        application_id: applicationId,
        funding_line: line,
        document_name: doc.document_name,
        description: doc.description,
        is_required: doc.is_required,
        is_preset: true,
        status: "pending",
        requested_by: requestedBy,
        requested_at: requestedAt,
      })
    })

    return rows
  }

  // Financiamiento General
  FINANCING_GENERAL_CHECKLIST.forEach((doc) => {
    rows.push({
      application_id: applicationId,
      funding_line: line,
      document_name: doc.document_name,
      description: doc.description,
      is_required: true,
      is_preset: true,
      status: "pending",
      requested_by: requestedBy,
      requested_at: requestedAt,
    })
  })

  return rows
}

async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers()
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null
    )
  } catch {
    return null
  }
}

async function getUserAgent(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get("user-agent")
  } catch {
    return null
  }
}
