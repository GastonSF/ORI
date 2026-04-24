"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { CLIENT_TYPES, FUNDING_LINES } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

// ============================================================
// SCHEMAS
// ============================================================

const setClientTypeSchema = z.object({
  client_type: z.enum(CLIENT_TYPES),
})

const cuitRegex = /^\d{2}-\d{8}-\d{1}$/

function validateCuitChecksum(cuit: string): boolean {
  const clean = cuit.replace(/-/g, "")
  if (clean.length !== 11) return false
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i], 10) * multipliers[i]
  }
  const mod = sum % 11
  const expectedChecksum = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod
  return expectedChecksum === parseInt(clean[10], 10)
}

const generalDataSchema = z.object({
  legal_name: z.string().trim().min(2, "Razón social requerida"),
  cuit: z
    .string()
    .trim()
    .regex(cuitRegex, "CUIT debe tener formato XX-XXXXXXXX-X")
    .refine(validateCuitChecksum, "CUIT inválido (dígito verificador incorrecto)"),
  contact_email: z.string().trim().email("Email inválido"),
  contact_phone: z.string().trim().optional().or(z.literal("")),
  fiscal_address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  province: z.string().trim().optional().or(z.literal("")),
  postal_code: z.string().trim().optional().or(z.literal("")),
  main_activity: z.string().trim().optional().or(z.literal("")),
  activity_start_date: z.string().optional().or(z.literal("")),
  annual_revenue: z.number().optional().nullable(),
})

const companyMemberSchema = z.object({
  full_name: z.string().trim().min(2, "Nombre requerido"),
  dni: z.string().trim().min(7, "DNI requerido"),
  role: z.string().trim().min(2, "Rol requerido"),
  participation_pct: z.number().min(0).max(100).optional().nullable(),
})

const companyMembersSchema = z.object({
  members: z.array(companyMemberSchema),
})

const fundingRequestSchema = z.object({
  requested_amount: z
    .number({ invalid_type_error: "Ingresá un monto válido" })
    .positive("El monto tiene que ser mayor a 0")
    .min(100_000, "El monto mínimo es $ 100.000")
    .max(10_000_000_000, "El monto es demasiado alto"),
  funding_line: z.enum(FUNDING_LINES),
})

export type SetClientTypeInput = z.infer<typeof setClientTypeSchema>
export type GeneralDataInput = z.infer<typeof generalDataSchema>
export type CompanyMembersInput = z.infer<typeof companyMembersSchema>
export type FundingRequestInput = z.infer<typeof fundingRequestSchema>

// ============================================================
// SERVER ACTIONS
// ============================================================

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
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .single()
  if (!client) return { ok: false, error: "Cliente no encontrado. Completá el paso 1 primero." }

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
  revalidatePath("/cliente")
  revalidatePath("/cliente/onboarding")
  revalidatePath("/cliente/solicitud")
  return { ok: true }
}

export async function saveCompanyMembersAction(
  input: CompanyMembersInput
): Promise<ActionResult> {
  const parsed = companyMembersSchema.safeParse(input)
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

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  await supabase.from("company_structure").delete().eq("client_id", client.id)

  if (parsed.data.members.length > 0) {
    const rows = parsed.data.members.map((m) => ({
      client_id: client.id,
      full_name: m.full_name,
      dni: m.dni,
      role: m.role,
      participation_pct: m.participation_pct ?? null,
    }))
    const { error: insErr } = await supabase.from("company_structure").insert(rows)
    if (insErr) return { ok: false, error: insErr.message }
  }

  const { error } = await supabase
    .from("clients")
    .update({ onboarding_step: Math.max(client.onboarding_step, 4) })
    .eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente/onboarding")
  return { ok: true }
}

// ============================================================
// SOLICITUD DE FONDEO (monto + línea) - PASO 4
// ============================================================

export async function saveFundingRequestAction(
  input: FundingRequestInput
): Promise<ActionResult> {
  const parsed = fundingRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .single()
  if (!client) {
    return { ok: false, error: "Cliente no encontrado. Completá los pasos anteriores." }
  }

  const { data: activeApp } = await supabase
    .from("applications")
    .select("id, status")
    .eq("client_id", client.id)
    .not(
      "status",
      "in",
      `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`
    )
    .maybeSingle()

  if (activeApp) {
    const { error: upErr } = await supabase
      .from("applications")
      .update({
        requested_amount: parsed.data.requested_amount,
        funding_line: parsed.data.funding_line,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeApp.id)
    if (upErr) return { ok: false, error: upErr.message }
  } else {
    const { error: insErr } = await supabase
      .from("applications")
      .insert({
        client_id: client.id,
        status: "draft",
        current_owner_role: "client",
        requested_amount: parsed.data.requested_amount,
        funding_line: parsed.data.funding_line,
      })
    if (insErr) {
      return { ok: false, error: insErr.message }
    }
  }

  const { error: stepErr } = await supabase
    .from("clients")
    .update({ onboarding_step: Math.max(client.onboarding_step, 5) })
    .eq("id", client.id)
  if (stepErr) return { ok: false, error: stepErr.message }

  revalidatePath("/cliente")
  revalidatePath("/cliente/onboarding")
  revalidatePath("/cliente/solicitud")
  return { ok: true }
}

export async function markOnboardingStepAction(input: {
  step: number
}): Promise<ActionResult> {
  if (input.step < 1 || input.step > 6) return { ok: false, error: "Paso inválido" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id, onboarding_step")
    .eq("owner_user_id", user.id)
    .single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  if (input.step > client.onboarding_step) {
    await supabase
      .from("clients")
      .update({ onboarding_step: input.step })
      .eq("id", client.id)
  }
  return { ok: true }
}

// ============================================================
// FINALIZAR Y ENVIAR SOLICITUD (un solo paso - botón del paso 6)
// ============================================================
// Hace 2 cosas en conjunto:
//  1. Marca el onboarding del cliente como completo
//  2. Cambia el status del legajo activo de "draft" a "submitted"
// Si no hay legajo activo (ej: el cliente se saltea datos), devuelve error.

export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", user.id)
    .single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  // Buscar el legajo activo en draft (el que se creó al guardar monto+línea)
  const { data: draftApp } = await supabase
    .from("applications")
    .select("id, status, requested_amount, funding_line")
    .eq("client_id", client.id)
    .in("status", ["draft"])
    .maybeSingle()

  if (!draftApp) {
    return {
      ok: false,
      error: "No encontramos un legajo en curso. Volvé a completar el paso 'Tu solicitud'.",
    }
  }

  if (!draftApp.requested_amount || !draftApp.funding_line) {
    return {
      ok: false,
      error: "Faltan el monto o la línea en tu solicitud. Completá el paso 'Tu solicitud'.",
    }
  }

  // 1. Enviar el legajo (draft -> submitted)
  const nowIso = new Date().toISOString()
  const { error: appErr } = await supabase
    .from("applications")
    .update({
      status: "submitted",
      submitted_at: nowIso,
      current_owner_role: "officer",
      updated_at: nowIso,
    })
    .eq("id", draftApp.id)

  if (appErr) {
    return { ok: false, error: appErr.message }
  }

  // 2. Marcar onboarding como completo (solo si el anterior funcionó)
  const { error: clientErr } = await supabase
    .from("clients")
    .update({ onboarding_completed: true, onboarding_step: 6 })
    .eq("id", client.id)

  if (clientErr) {
    // Intentar rollback del legajo si falla esto
    await supabase
      .from("applications")
      .update({
        status: "draft",
        submitted_at: null,
        current_owner_role: "client",
      })
      .eq("id", draftApp.id)
    return { ok: false, error: clientErr.message }
  }

  revalidatePath("/cliente")
  revalidatePath("/cliente/onboarding")
  revalidatePath("/staff")
  revalidatePath("/staff/dictamenes")
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

export async function updateClientContactAction(
  input: UpdateContactInput
): Promise<ActionResult> {
  const parsed = updateContactSchema.safeParse(input)
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
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", user.id)
    .single()
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  const { error } = await supabase
    .from("clients")
    .update({
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone || null,
      fiscal_address: parsed.data.fiscal_address || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      postal_code: parsed.data.postal_code || null,
    })
    .eq("id", client.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/cliente")
  revalidatePath("/cliente/solicitud")
  return { ok: true }
}
