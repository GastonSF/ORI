"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { canClientCancel, type ApplicationStatus } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

type CreateAppResult = {
  application_id: string
  application_number: string
}

export async function createApplicationAction(): Promise<ActionResult<CreateAppResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_completed")
    .eq("owner_user_id", user.id)
    .single()
  if (!client) return { ok: false, error: "Primero tenés que completar los datos de tu empresa" }
  if (!client.onboarding_completed) return { ok: false, error: "Terminá tu onboarding antes de iniciar una solicitud" }

  const { data: activeApp } = await supabase
    .from("applications")
    .select("id, application_number")
    .eq("client_id", client.id)
    .not("status", "in", `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`)
    .maybeSingle()
  if (activeApp) {
    return {
      ok: false,
      error: `Ya tenés un legajo activo (${activeApp.application_number}). Primero cerralo o cancelalo.`,
    }
  }

  const { data: newApp, error } = await supabase
    .from("applications")
    .insert({ client_id: client.id, status: "draft", current_owner_role: "client" })
    .select("id, application_number")
    .single()
  if (error) return { ok: false, error: error.message }

  revalidatePath("/cliente")
  revalidatePath("/cliente/solicitud")
  revalidatePath("/cliente/documentos")
  return {
    ok: true,
    data: {
      application_id: newApp.id,
      application_number: newApp.application_number,
    },
  }
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
    return { ok: false, error: "Este legajo ya fue enviado" }
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "pending_authorization",
      current_owner_role: "officer",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", input.application_id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/cliente")
  revalidatePath("/cliente/solicitud")
  revalidatePath("/cliente/documentos")
  return { ok: true }
}

const cancelSchema = z.object({
  application_id: z.string().uuid(),
  reason: z.string().trim().min(3, "La razón es requerida"),
})

export type CancelApplicationInput = z.infer<typeof cancelSchema>

export async function cancelApplicationAction(input: CancelApplicationInput): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: app } = await supabase
    .from("applications")
    .select("id, status, clients!inner(owner_user_id)")
    .eq("id", parsed.data.application_id)
    .single()
  if (!app) return { ok: false, error: "Legajo no encontrado" }

  const ownerId = Array.isArray(app.clients)
    ? app.clients[0]?.owner_user_id
    : (app.clients as { owner_user_id: string })?.owner_user_id
  if (ownerId !== user.id) return { ok: false, error: "No autorizado" }

  const status = app.status as ApplicationStatus
  if (!canClientCancel(status)) {
    return { ok: false, error: "No podés cancelar este legajo en su estado actual. Contactá a tu oficial." }
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "cancelled_by_client",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: parsed.data.reason,
      current_owner_role: "client",
    })
    .eq("id", parsed.data.application_id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/cliente")
  revalidatePath("/cliente/solicitud")
  revalidatePath("/cliente/documentos")
  return { ok: true }
}
