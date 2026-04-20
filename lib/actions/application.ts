"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  applicationCreateSchema,
  applicationCancelSchema,
  type ApplicationCreateInput,
  type ApplicationCancelInput,
} from "@/lib/validators/schemas"
import { canClientCancel, type ApplicationStatus } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function createApplicationAction(
  input: ApplicationCreateInput
): Promise<ActionResult<{ application_id: string }>> {
  const parsed = applicationCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_completed")
    .eq("id", parsed.data.client_id)
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) return { ok: false, error: "Cliente no encontrado o no autorizado" }
  if (!client.onboarding_completed) return { ok: false, error: "Completá primero tu onboarding" }

  const { data: activeApp } = await supabase
    .from("applications")
    .select("id, application_number, status")
    .eq("client_id", client.id)
    .not(
      "status",
      "in",
      `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`
    )
    .maybeSingle()

  if (activeApp) {
    return {
      ok: false,
      error: `Ya tenés un legajo activo (${activeApp.application_number}). Cancelalo o esperá a que termine antes de iniciar otro.`,
    }
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      client_id: client.id,
      requested_amount: parsed.data.requested_amount,
      requested_term_months: parsed.data.requested_term_months,
      purpose: parsed.data.purpose,
      status: "draft",
      current_owner_role: "client",
    })
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? "No pudimos crear el legajo" }

  revalidatePath("/cliente", "layout")
  return { ok: true, data: { application_id: data.id } }
}

export async function submitApplicationAction(input: { application_id: string }): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: app } = await supabase
    .from("applications")
    .select("id, status, client_id, clients!inner(owner_user_id)")
    .eq("id", input.application_id)
    .single()

  if (!app) return { ok: false, error: "Legajo no encontrado" }

  const ownerId = Array.isArray(app.clients)
    ? app.clients[0]?.owner_user_id
    : (app.clients as { owner_user_id: string })?.owner_user_id
  if (ownerId !== user.id) return { ok: false, error: "No autorizado" }

  if (app.status !== "draft" && app.status !== "docs_requested") {
    return { ok: false, error: "El legajo no está en un estado válido para enviarlo" }
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "pending_authorization" as ApplicationStatus,
      current_owner_role: "officer",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", input.application_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente", "layout")
  return { ok: true }
}

export async function cancelApplicationAction(input: ApplicationCancelInput): Promise<ActionResult> {
  const parsed = applicationCancelSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Motivo requerido", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: app } = await supabase
    .from("applications")
    .select("id, status, client_id, clients!inner(owner_user_id)")
    .eq("id", parsed.data.application_id)
    .single()

  if (!app) return { ok: false, error: "Legajo no encontrado" }

  const ownerId = Array.isArray(app.clients)
    ? app.clients[0]?.owner_user_id
    : (app.clients as { owner_user_id: string })?.owner_user_id
  if (ownerId !== user.id) return { ok: false, error: "No autorizado" }

  if (!canClientCancel(app.status as ApplicationStatus)) {
    return { ok: false, error: "En este estado no podés cancelar directamente. Contactá con el oficial." }
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "cancelled_by_client" as ApplicationStatus,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: parsed.data.reason,
    })
    .eq("id", parsed.data.application_id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente", "layout")
  redirect("/cliente")
}
