"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

// ============================================================
// EDITAR UN DICTAMEN YA EMITIDO
// ============================================================
// Reglas:
//  - El analista autor puede editar siempre su propio dictamen.
//  - El admin puede editar cualquier dictamen.
//  - Otros analistas (no-autores) NO pueden editar.
//  - Se requiere re-autenticación con la contraseña actual del usuario.
//  - Se registra el cambio en audit_log con el antes/después + motivo.
//  - El dictamen queda "firmado" por quien editó (last_edited_by).

const editSchema = z
  .object({
    dictamen_id: z.string().uuid(),
    current_password: z.string().min(1, "Ingresá tu contraseña"),
    motivo: z
      .string()
      .trim()
      .min(10, "El motivo tiene que tener al menos 10 caracteres")
      .max(2000),
    // Campos editables del dictamen
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
      if (d.decision === "approved" && (d.approved_amount == null || d.approved_amount <= 0)) {
        return false
      }
      return true
    },
    { message: "Si aprobás, tenés que indicar el monto aprobado", path: ["approved_amount"] }
  )

type EditInput = z.infer<typeof editSchema>

export async function editarDictamenAction(
  input: EditInput
): Promise<ActionResult<{ dictamen_id: string }>> {
  const parsed = editSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: "No autenticado" }

  // Validar rol
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, full_name")
    .eq("id", user.id)
    .single()
  if (!profile || !profile.is_active) return { ok: false, error: "Perfil inactivo" }
  if (profile.role !== "analyst" && profile.role !== "admin") {
    return { ok: false, error: "Solo analistas o admins pueden editar dictámenes" }
  }

  // Traer el dictamen actual (para validar permisos + guardar old_value)
  const { data: current, error: currentErr } = await supabase
    .from("dictamenes")
    .select("*")
    .eq("id", parsed.data.dictamen_id)
    .single()
  if (currentErr || !current) return { ok: false, error: "Dictamen no encontrado" }

  // Validar permiso de edición: autor o admin
  const isAuthor = current.analyst_id === user.id
  const isAdmin = profile.role === "admin"
  if (!isAuthor && !isAdmin) {
    return {
      ok: false,
      error: "Solo el analista que emitió el dictamen o un admin pueden editarlo",
    }
  }

  // ========== RE-AUTENTICACIÓN ==========
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  })
  if (signInError) {
    return {
      ok: false,
      error: "La contraseña es incorrecta",
      fieldErrors: { current_password: ["La contraseña es incorrecta"] },
    }
  }

  // ========== UPDATE DEL DICTAMEN ==========
  const nowIso = new Date().toISOString()
  const newValues = {
    decision: parsed.data.decision,
    approved_amount: parsed.data.approved_amount ?? null,
    term_months: parsed.data.term_months ?? null,
    interest_rate: parsed.data.interest_rate ?? null,
    conditions: parsed.data.conditions?.trim() || null,
    observations: parsed.data.observations?.trim() || null,
    justification: parsed.data.justification.trim(),
    last_edited_by: user.id,
    last_edited_at: nowIso,
    edit_count: (current.edit_count ?? 0) + 1,
    updated_at: nowIso,
  }

  const { error: updateError } = await supabase
    .from("dictamenes")
    .update(newValues)
    .eq("id", parsed.data.dictamen_id)

  if (updateError) return { ok: false, error: updateError.message }

  // ========== ACTUALIZAR APPLICATION.STATUS SI CAMBIÓ LA DECISIÓN ==========
  if (parsed.data.decision !== current.decision) {
    const newAppStatus =
      parsed.data.decision === "approved"
        ? "approved"
        : parsed.data.decision === "rejected"
        ? "rejected_by_analyst"
        : "observed"
    const newOwnerRole = parsed.data.decision === "observed" ? "analyst" : "client"

    await supabase
      .from("applications")
      .update({
        status: newAppStatus,
        current_owner_role: newOwnerRole,
        dictamen_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", current.application_id)
  }

  // ========== LOG DE AUDITORÍA ==========
  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "dictamen_edited",
    entity_type: "dictamenes",
    entity_id: parsed.data.dictamen_id,
    old_value: {
      decision: current.decision,
      approved_amount: current.approved_amount,
      term_months: current.term_months,
      interest_rate: current.interest_rate,
      conditions: current.conditions,
      observations: current.observations,
      justification: current.justification,
    },
    new_value: {
      ...newValues,
      motivo: parsed.data.motivo.trim(),
      edited_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath("/staff/dictamenes")
  revalidatePath(`/staff/legajo/${current.application_id}`)
  revalidatePath("/staff")
  revalidatePath("/cliente", "layout")

  return { ok: true, data: { dictamen_id: parsed.data.dictamen_id } }
}

// ============================================================
// HELPERS
// ============================================================

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
