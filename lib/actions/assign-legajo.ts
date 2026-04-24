"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ============================================================
// TOMAR UN LEGAJO (asignarme a mí)
// ============================================================
// Reglas:
//  - Solo staff (officer, admin) puede tomar un legajo.
//  - Cualquier oficial puede tomar cualquier legajo, incluso si ya
//    tiene dueño (modelo de pool abierto + trazabilidad).
//  - Queda registrado en audit_log: quién tomó, de quién, cuándo.

const takeSchema = z.object({
  application_id: z.string().uuid(),
})

export async function takeLegajoAction(
  input: z.infer<typeof takeSchema>
): Promise<ActionResult> {
  const parsed = takeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Datos inválidos" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, full_name")
    .eq("id", user.id)
    .single()
  if (!profile || !profile.is_active) {
    return { ok: false, error: "Perfil inactivo" }
  }
  if (profile.role !== "officer" && profile.role !== "admin") {
    return { ok: false, error: "Solo los oficiales pueden tomar legajos" }
  }

  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("id, assigned_officer_id, application_number, status")
    .eq("id", parsed.data.application_id)
    .single()

  if (appErr || !app) return { ok: false, error: "Legajo no encontrado" }

  const previousOwnerId = app.assigned_officer_id
  if (previousOwnerId === user.id) {
    return { ok: false, error: "Este legajo ya está asignado a vos" }
  }

  const { error: updateErr } = await supabase
    .from("applications")
    .update({
      assigned_officer_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.application_id)

  if (updateErr) return { ok: false, error: updateErr.message }

  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: previousOwnerId ? "legajo_reassigned_to_self" : "legajo_taken",
    entity_type: "applications",
    entity_id: parsed.data.application_id,
    old_value: { assigned_officer_id: previousOwnerId },
    new_value: {
      assigned_officer_id: user.id,
      taken_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath(`/staff/legajo/${parsed.data.application_id}`)
  revalidatePath("/staff")
  revalidatePath("/staff/dictamenes")

  return { ok: true }
}

// ============================================================
// SOLTAR UN LEGAJO (dejar sin asignar)
// ============================================================

const releaseSchema = z.object({
  application_id: z.string().uuid(),
})

export async function releaseLegajoAction(
  input: z.infer<typeof releaseSchema>
): Promise<ActionResult> {
  const parsed = releaseSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Datos inválidos" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, full_name")
    .eq("id", user.id)
    .single()
  if (!profile || !profile.is_active) {
    return { ok: false, error: "Perfil inactivo" }
  }
  if (profile.role !== "officer" && profile.role !== "admin") {
    return { ok: false, error: "Solo los oficiales pueden soltar legajos" }
  }

  const { data: app } = await supabase
    .from("applications")
    .select("id, assigned_officer_id")
    .eq("id", parsed.data.application_id)
    .single()

  if (!app) return { ok: false, error: "Legajo no encontrado" }
  if (!app.assigned_officer_id) {
    return { ok: false, error: "Este legajo ya está sin asignar" }
  }

  const isOwner = app.assigned_officer_id === user.id
  const isAdmin = profile.role === "admin"
  if (!isOwner && !isAdmin) {
    return {
      ok: false,
      error: "Solo podés soltar legajos que están asignados a vos",
    }
  }

  const { error: updateErr } = await supabase
    .from("applications")
    .update({
      assigned_officer_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.application_id)

  if (updateErr) return { ok: false, error: updateErr.message }

  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "legajo_released",
    entity_type: "applications",
    entity_id: parsed.data.application_id,
    old_value: { assigned_officer_id: app.assigned_officer_id },
    new_value: {
      assigned_officer_id: null,
      released_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath(`/staff/legajo/${parsed.data.application_id}`)
  revalidatePath("/staff")

  return { ok: true }
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
