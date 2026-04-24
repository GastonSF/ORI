"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import {
  FGPLUS_PRESET_DOCS,
  FINANCING_GENERAL_CHECKLIST,
  type FundingLine,
} from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

type AdvanceResult = ActionResult<{ requests_created: number }>

/**
 * Avanza un legajo desde "análisis inicial" a "docs específicos de la línea".
 *
 * Lo llama el oficial cuando terminó de aprobar los docs iniciales.
 * Hace 3 cosas:
 *   1. Cambia el status del legajo a 'additional_docs_pending'
 *   2. Deja el legajo en manos del cliente (current_owner_role = 'client')
 *   3. Crea los additional_document_requests según la línea elegida
 *
 * Reglas:
 *   - Solo oficial asignado o admin pueden ejecutarla
 *   - El legajo debe estar en análisis inicial (authorized / docs_in_review /
 *     submitted / pending_authorization)
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
      error: "Este legajo ya tiene documentación adicional asignada.",
    }
  }

  // Crear los requests según la línea
  const presetDocs = getPresetDocsForLine(app.funding_line as FundingLine)
  const nowIso = new Date().toISOString()

  const requestsToCreate = presetDocs.map((doc) => ({
    application_id: app.id,
    funding_line: app.funding_line as FundingLine,
    document_name: doc.document_name,
    description: doc.description,
    is_required: doc.is_required,
    is_preset: true,
    status: "pending" as const,
    requested_by: user.id,
    requested_at: nowIso,
  }))

  const { error: reqErr } = await supabase
    .from("additional_document_requests")
    .insert(requestsToCreate)

  if (reqErr) {
    return {
      ok: false,
      error: `Error creando pedidos de docs: ${reqErr.message}`,
    }
  }

  // Cambiar el status del legajo
  const { error: updateErr } = await supabase
    .from("applications")
    .update({
      status: "additional_docs_pending",
      current_owner_role: "client",
      updated_at: nowIso,
    })
    .eq("id", app.id)

  if (updateErr) {
    // Rollback: borrar los requests creados si falla el update del status
    await supabase
      .from("additional_document_requests")
      .delete()
      .eq("application_id", app.id)
      .eq("requested_by", user.id)
      .gte("requested_at", nowIso)
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
      funding_line: app.funding_line,
      requests_created: requestsToCreate.length,
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

  return {
    ok: true,
    data: { requests_created: requestsToCreate.length },
  }
}

// ============================================================
// HELPERS
// ============================================================

type PresetDoc = {
  document_name: string
  description: string
  is_required: boolean
}

function getPresetDocsForLine(line: FundingLine): PresetDoc[] {
  if (line === "fgplus") {
    return FGPLUS_PRESET_DOCS.map((d) => ({
      document_name: d.document_name,
      description: d.description,
      is_required: d.is_required,
    }))
  }
  // financing_general: todos los del checklist son recomendados pero no required por default
  // (el analista después puede agregar más con "Otros")
  return FINANCING_GENERAL_CHECKLIST.map((d) => ({
    document_name: d.document_name,
    description: d.description,
    is_required: true,
  }))
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
