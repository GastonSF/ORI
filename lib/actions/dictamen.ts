"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { DictamenDecision } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

// ============================================================
// EMITIR DICTAMEN
// ============================================================
// Solo el analista (o admin) puede emitir un dictamen.
// El dictamen mueve el estado del legajo al final del flujo:
//   - approved  → applications.status = 'approved'
//   - rejected  → applications.status = 'rejected_by_analyst'
//   - observed  → applications.status = 'observed' (el flujo sigue, pidiendo aclaraciones)

const emitirDictamenSchema = z
  .object({
    application_id: z.string().uuid(),
    decision: z.enum(["approved", "rejected", "observed"]),
    approved_amount: z.number().positive().nullable().optional(),
    term_months: z.number().int().positive().nullable().optional(),
    interest_rate: z.number().nonnegative().nullable().optional(),
    conditions: z.string().trim().max(2000).nullable().optional(),
    observations: z.string().trim().max(2000).nullable().optional(),
    justification: z
      .string()
      .trim()
      .min(20, "El fundamento tiene que tener al menos 20 caracteres")
      .max(5000),
  })
  .refine(
    (d) => {
      // Si la decisión es "approved", el monto aprobado es obligatorio
      if (d.decision === "approved" && (d.approved_amount == null || d.approved_amount <= 0)) {
        return false
      }
      return true
    },
    {
      message: "Si aprobás, tenés que indicar el monto aprobado",
      path: ["approved_amount"],
    }
  )

type EmitirDictamenInput = z.infer<typeof emitirDictamenSchema>

export async function emitirDictamenAction(
  input: EmitirDictamenInput
): Promise<ActionResult<{ dictamen_id: string }>> {
  const parsed = emitirDictamenSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar que sea analista o admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.is_active) {
    return { ok: false, error: "Perfil inactivo o no encontrado" }
  }
  if (profile.role !== "analyst" && profile.role !== "admin") {
    return { ok: false, error: "Solo los analistas pueden emitir dictámenes" }
  }

  // Validar que el legajo existe y está en un estado dictaminable
  const { data: app } = await supabase
    .from("applications")
    .select("id, status")
    .eq("id", parsed.data.application_id)
    .single()

  if (!app) return { ok: false, error: "Legajo no encontrado" }

  const dictaminableStatuses = ["in_risk_analysis", "observed"]
  if (!dictaminableStatuses.includes(app.status)) {
    return {
      ok: false,
      error: `Este legajo no está en estado dictaminable (estado actual: ${app.status})`,
    }
  }

  // Verificar que no haya un dictamen previo (los dictámenes se editan, no se duplican)
  const { data: existing } = await supabase
    .from("dictamenes")
    .select("id")
    .eq("application_id", parsed.data.application_id)
    .maybeSingle()

  if (existing) {
    return {
      ok: false,
      error: "Este legajo ya tiene un dictamen emitido. Usá la edición para modificarlo.",
    }
  }

  // Insertar el dictamen
  const { data: dictamen, error: insertError } = await supabase
    .from("dictamenes")
    .insert({
      application_id: parsed.data.application_id,
      analyst_id: user.id,
      decision: parsed.data.decision,
      approved_amount: parsed.data.approved_amount ?? null,
      term_months: parsed.data.term_months ?? null,
      interest_rate: parsed.data.interest_rate ?? null,
      conditions: parsed.data.conditions?.trim() || null,
      observations: parsed.data.observations?.trim() || null,
      justification: parsed.data.justification.trim(),
    })
    .select("id")
    .single()

  if (insertError || !dictamen) {
    return {
      ok: false,
      error: insertError?.message ?? "No pudimos guardar el dictamen",
    }
  }

  // Actualizar el estado del legajo según la decisión
  const newAppStatus = mapDecisionToAppStatus(parsed.data.decision)
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status: newAppStatus,
      dictamen_at: new Date().toISOString(),
      current_owner_role: parsed.data.decision === "observed" ? "analyst" : "client",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.application_id)

  if (updateError) {
    // El dictamen ya se insertó. Logueamos pero no abortamos.
    console.error(
      "[emitirDictamenAction] dictamen creado pero no se pudo actualizar app.status:",
      updateError.message
    )
  }

  revalidatePath("/staff/dictamenes")
  revalidatePath(`/staff/legajo/${parsed.data.application_id}`)
  revalidatePath("/staff")
  revalidatePath("/cliente", "layout")

  return { ok: true, data: { dictamen_id: dictamen.id } }
}

// ============================================================
// HELPERS
// ============================================================

function mapDecisionToAppStatus(decision: DictamenDecision) {
  switch (decision) {
    case "approved":
      return "approved"
    case "rejected":
      return "rejected_by_analyst"
    case "observed":
      return "observed"
  }
}
