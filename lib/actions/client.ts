"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  setClientTypeSchema,
  generalDataSchema,
  companyMembersSchema,
  type SetClientTypeInput,
  type GeneralDataInput,
  type CompanyMembersInput,
} from "@/lib/validators/schemas"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function setClientTypeAction(
  input: SetClientTypeInput
): Promise<ActionResult<{ client_id: string }>> {
  const parsed = setClientTypeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("clients")
      .update({ client_type: parsed.data.client_type, onboarding_step: 2 })
      .eq("id", existing.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true, data: { client_id: existing.id } }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({
      owner_user_id: user.id,
      client_type: parsed.data.client_type,
      legal_name: profile?.full_name ?? "Sin nombre",
      cuit: "00-00000000-0",
      contact_email: user.email ?? "sin@email.com",
      onboarding_step: 2,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente")
  revalidatePath("/cliente/onboarding")
  return { ok: true, data: { client_id: newClient.id } }
}

export async function saveGeneralDataAction(
  input: GeneralDataInput
): Promise<ActionResult> {
  const parsed = generalDataSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients").select("id, onboarding_step").eq("owner_user_id", user.id).single()
  if (!client) return { ok: false, error: "Cliente no encontrado. Completá el paso 1 primero." }

  const { error } = await supabase.from("clients").update({
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
  }).eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente")
  revalidatePath("/cliente/onboarding")
  revalidatePath("/cliente/solicitud")
  return { ok: true }
}

export async function saveCompanyMembersAction(input: CompanyMembersInput): Promise<ActionResult> {
  const parsed = companyMembersSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }
  const { data: client } = await supabase.from("clients").select("id, onboarding_step").eq("owner_user_id", user.id).single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }
  await supabase.from("company_structure").delete().eq("client_id", client.id)
  if (parsed.data.members.length > 0) {
    const rows = parsed.data.members.map((m) => ({
      client_id: client.id, full_name: m.full_name, dni: m.dni, role: m.role,
      participation_pct: m.participation_pct ?? null,
    }))
    const { error: insErr } = await supabase.from("company_structure").insert(rows)
    if (insErr) return { ok: false, error: insErr.message }
  }
  const { error } = await supabase.from("clients")
    .update({ onboarding_step: Math.max(client.onboarding_step, 4) }).eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente/onboarding")
  return { ok: true }
}

export async function markOnboardingStepAction(input: { step: number }): Promise<ActionResult> {
  if (input.step < 1 || input.step > 5) return { ok: false, error: "Paso inválido" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }
  const { data: client } = await supabase.from("clients").select("id, onboarding_step").eq("owner_user_id", user.id).single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }
  if (input.step > client.onboarding_step) {
    await supabase.from("clients").update({ onboarding_step: input.step }).eq("id", client.id)
  }
  return { ok: true }
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }
  const { data: client } = await supabase.from("clients").select("id").eq("owner_user_id", user.id).single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }
  const { error } = await supabase.from("clients")
    .update({ onboarding_completed: true, onboarding_step: 5 }).eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente")
  revalidatePath("/cliente/onboarding")
  return { ok: true }
}

// ============================================================
// EDICIÓN DE CONTACTO POST-ONBOARDING
// ============================================================

const updateContactSchema = z.object({
  contact_email: z.string().email("Email inválido"),
  contact_phone: z.string().trim().optional().or(z.literal("")),
  fiscal_address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  province: z.string().trim().optional().or(z.literal("")),
  postal_code: z.string().trim().optional().or(z.literal("")),
})

export type UpdateContactInput = z.infer<typeof updateContactSchema>

export async function updateClientContactAction(input: UpdateContactInput): Promise<ActionResult> {
  const parsed = updateContactSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }
  const { data: client } = await supabase.from("clients").select("id").eq("owner_user_id", user.id).single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }
  const { error } = await supabase.from("clients").update({
    contact_email: parsed.data.contact_email,
    contact_phone: parsed.data.contact_phone || null,
    fiscal_address: parsed.data.fiscal_address || null,
    city: parsed.data.city || null,
    province: parsed.data.province || null,
    postal_code: parsed.data.postal_code || null,
  }).eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente")
  revalidatePath("/cliente/solicitud")
  return { ok: true }
}
