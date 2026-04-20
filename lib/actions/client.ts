"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  clientGeneralDataSchema,
  companyMemberSchema,
  type ClientGeneralDataInput,
  type CompanyMemberInput,
} from "@/lib/validators/schemas"
import type { ClientType } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

// PASO 1: tipo de cliente
export async function setClientTypeAction(input: {
  client_type: ClientType
}): Promise<ActionResult<{ client_id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: existing } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("clients")
      .update({
        client_type: input.client_type,
        onboarding_step: Math.max(existing.onboarding_step, 2),
      })
      .eq("id", existing.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/cliente/onboarding")
    return { ok: true, data: { client_id: existing.id } }
  }

  const tempCuit = `00-${String(Date.now()).slice(-8)}-0`
  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_user_id: user.id,
      client_type: input.client_type,
      legal_name: "__pendiente__",
      cuit: tempCuit,
      contact_email: user.email ?? "__pendiente__",
      onboarding_step: 2,
    })
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? "No pudimos crear tu perfil" }
  revalidatePath("/cliente/onboarding")
  return { ok: true, data: { client_id: data.id } }
}

// PASO 2: datos generales
export async function saveGeneralDataAction(input: ClientGeneralDataInput): Promise<ActionResult> {
  const parsed = clientGeneralDataSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (!client) return { ok: false, error: "Todavía no definiste el tipo de cliente" }

  const { data: duplicated } = await supabase
    .from("clients")
    .select("id")
    .eq("cuit", parsed.data.cuit)
    .neq("id", client.id)
    .maybeSingle()
  if (duplicated) {
    return {
      ok: false,
      error: "Ya existe otro cliente registrado con este CUIT",
      fieldErrors: { cuit: ["CUIT ya registrado"] },
    }
  }

  const { error } = await supabase
    .from("clients")
    .update({
      legal_name: parsed.data.legal_name,
      cuit: parsed.data.cuit,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone || null,
      fiscal_address: parsed.data.fiscal_address || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      postal_code: parsed.data.postal_code || null,
      main_activity: parsed.data.main_activity || null,
      activity_start_date: parsed.data.activity_start_date || null,
      annual_revenue: parsed.data.annual_revenue ?? null,
      onboarding_step: Math.max(client.onboarding_step, 3),
    })
    .eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente/onboarding")
  return { ok: true }
}

// PASO 3: estructura societaria
export async function saveCompanyMembersAction(input: {
  members: CompanyMemberInput[]
}): Promise<ActionResult> {
  for (const member of input.members) {
    const parsed = companyMemberSchema.safeParse(member)
    if (!parsed.success) {
      return { ok: false, error: "Datos de miembros inválidos", fieldErrors: parsed.error.flatten().fieldErrors }
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  await supabase.from("company_structure").delete().eq("client_id", client.id)

  if (input.members.length > 0) {
    const toInsert = input.members.map((m) => ({
      client_id: client.id,
      full_name: m.full_name,
      dni: m.dni,
      role: m.role,
      participation_pct: m.participation_pct ?? null,
    }))
    const { error } = await supabase.from("company_structure").insert(toInsert)
    if (error) return { ok: false, error: error.message }
  }

  await supabase
    .from("clients")
    .update({ onboarding_step: Math.max(client.onboarding_step, 4) })
    .eq("id", client.id)
  revalidatePath("/cliente/onboarding")
  return { ok: true }
}

export async function markOnboardingStepAction(step: number): Promise<ActionResult> {
  if (step < 1 || step > 5) return { ok: false, error: "Paso inválido" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  const { error } = await supabase
    .from("clients")
    .update({ onboarding_step: Math.max(client.onboarding_step, step) })
    .eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente/onboarding")
  return { ok: true }
}

// PASO 5: completar
export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, cuit")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  if (client.legal_name === "__pendiente__" || client.cuit.startsWith("00-")) {
    return { ok: false, error: "Primero completá los datos generales (paso 2)" }
  }

  const { error } = await supabase
    .from("clients")
    .update({ onboarding_completed: true, onboarding_step: 5 })
    .eq("id", client.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/cliente", "layout")
  redirect("/cliente")
}
