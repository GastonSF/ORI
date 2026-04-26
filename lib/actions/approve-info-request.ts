"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type FundingLine } from "@/lib/constants/roles"

export type ApproveInfoRequestResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Action del oficial: aprueba el pedido de información del cliente y
 * pasa el legajo a análisis de riesgo (analista).
 *
 * Solo el oficial asignado o admin pueden ejecutar esta action.
 *
 * Transición:
 *   - Status: additional_docs_review → in_risk_analysis
 *   - current_owner_role: officer → analyst
 *   - sent_to_analyst_at: NOW()
 *
 * Notar que NO se valida que cada documento esté aprobado individualmente
 * por una decisión de UX: el oficial puede aprobar el pedido como un todo
 * sin tener que aprobar uno por uno cada archivo. Si necesita rechazar un
 * archivo específico, puede hacerlo antes con el botón "Rechazar" y entonces
 * el legajo no avanzará hasta que el cliente lo corrija.
 *
 * Para FGPlus: la action también requiere que el cliente haya completado
 * el árbol de cobranza (info_request_completed_at no null).
 */
export async function approveInfoRequestAction(input: {
  application_id: string
}): Promise<ApproveInfoRequestResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // ============================================================
  // Validar permisos del usuario (officer asignado o admin)
  // ============================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return { ok: false, error: "Perfil no encontrado" }
  }

  if (profile.role !== "officer" && profile.role !== "admin") {
    return {
      ok: false,
      error: "Solo el oficial o admin pueden aprobar el pedido",
    }
  }

  // ============================================================
  // Cargar el legajo y validar
  // ============================================================
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select(
      "id, application_number, status, funding_line, assigned_officer_id, info_request_completed_at"
    )
    .eq("id", input.application_id)
    .single()

  if (appErr || !app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  // Si es officer (no admin), debe ser el asignado
  if (profile.role === "officer" && app.assigned_officer_id !== user.id) {
    return {
      ok: false,
      error: "Solo el oficial asignado puede aprobar este legajo",
    }
  }

  // El legajo debe estar en additional_docs_review
  if (app.status !== "additional_docs_review") {
    return {
      ok: false,
      error: `El legajo está en estado "${app.status}". Solo se puede aprobar el pedido cuando está en revisión.`,
    }
  }

  // Para FGPlus, el cliente debe haber enviado el pedido (con info_request_completed_at)
  if (
    (app.funding_line as FundingLine) === "fgplus" &&
    !app.info_request_completed_at
  ) {
    return {
      ok: false,
      error: "El cliente todavía no envió formalmente el pedido de información",
    }
  }

  // ============================================================
  // Transición: additional_docs_review → in_risk_analysis
  // ============================================================
  const now = new Date().toISOString()

  const { error: updateErr } = await supabase
    .from("applications")
    .update({
      status: "in_risk_analysis",
      current_owner_role: "analyst",
      sent_to_analyst_at: now,
      updated_at: now,
    })
    .eq("id", app.id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error actualizando legajo: ${updateErr.message}`,
    }
  }

  // ============================================================
  // Audit log (best-effort, no fallar si no se puede insertar)
  // ============================================================
  try {
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "approve_info_request",
      entity_type: "application",
      entity_id: app.id,
      old_value: { status: "additional_docs_review" },
      new_value: { status: "in_risk_analysis" },
    })
  } catch {
    // No-op
  }

  // ============================================================
  // Revalidar paths
  // ============================================================
  revalidatePath(`/staff/legajo/${app.id}`)
  revalidatePath(`/staff/dictamenes`)
  revalidatePath(`/staff`)
  revalidatePath(`/cliente`)

  return { ok: true }
}
