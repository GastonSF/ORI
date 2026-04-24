"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ============================================================
// APROBAR UN DOCUMENTO
// ============================================================
// Reglas:
//  - Solo officer asignado al legajo o admin pueden aprobar.
//  - Analista no revisa docs iniciales (ellos dictaminan al final).
//  - El doc tiene que estar en status "uploaded" (no se aprueba dos veces).
//  - Queda registrado en audit_log + en reviewed_by/reviewed_at.

const approveSchema = z.object({
  document_id: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
})

export async function approveDocumentAction(
  input: z.infer<typeof approveSchema>
): Promise<ActionResult> {
  const parsed = approveSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Datos inválidos" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    return {
      ok: false,
      error: "Solo oficiales o admins pueden revisar documentos",
    }
  }

  // Traer el doc + legajo asociado para validar asignación
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select(
      `
        id,
        application_id,
        document_type,
        file_name,
        status,
        application:applications!inner(
          id,
          application_number,
          assigned_officer_id
        )
      `
    )
    .eq("id", parsed.data.document_id)
    .single()

  if (docErr || !doc) return { ok: false, error: "Documento no encontrado" }

  const application = Array.isArray(doc.application)
    ? doc.application[0]
    : doc.application
  if (!application) return { ok: false, error: "Legajo no encontrado" }

  // Officer tiene que estar asignado (admin puede sin)
  const isAdmin = profile.role === "admin"
  const isAssignedOfficer = application.assigned_officer_id === user.id
  if (!isAdmin && !isAssignedOfficer) {
    return {
      ok: false,
      error: "Tenés que tomar el legajo primero antes de revisar sus documentos",
    }
  }

  if (doc.status !== "uploaded") {
    return {
      ok: false,
      error: `El documento está ${doc.status === "approved" ? "ya aprobado" : doc.status === "rejected" ? "rechazado" : "en un estado que no se puede aprobar"}`,
    }
  }

  // Actualizar el doc
  const { error: updateErr } = await supabase
    .from("documents")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.document_id)

  if (updateErr) return { ok: false, error: updateErr.message }

  // Log de auditoría
  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "document_approved",
    entity_type: "documents",
    entity_id: parsed.data.document_id,
    old_value: { status: "uploaded" },
    new_value: {
      status: "approved",
      document_type: doc.document_type,
      file_name: doc.file_name,
      application_number: application.application_number,
      note: parsed.data.note ?? null,
      approved_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath(`/staff/legajo/${application.id}`)
  revalidatePath("/cliente")
  revalidatePath("/cliente/documentos")

  return { ok: true }
}

// ============================================================
// RECHAZAR UN DOCUMENTO
// ============================================================
// Reglas:
//  - Igual que aprobar (staff asignado o admin).
//  - Motivo OBLIGATORIO (mín 10 chars), va a llegar al cliente.
//  - El doc tiene que estar en status "uploaded".

const rejectSchema = z.object({
  document_id: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "El motivo tiene que tener al menos 10 caracteres para que el cliente entienda")
    .max(500, "El motivo es demasiado largo (máx 500 caracteres)"),
})

export async function rejectDocumentAction(
  input: z.infer<typeof rejectSchema>
): Promise<ActionResult> {
  const parsed = rejectSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    return {
      ok: false,
      error: "Solo oficiales o admins pueden revisar documentos",
    }
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select(
      `
        id,
        application_id,
        document_type,
        file_name,
        status,
        application:applications!inner(
          id,
          application_number,
          assigned_officer_id
        )
      `
    )
    .eq("id", parsed.data.document_id)
    .single()

  if (docErr || !doc) return { ok: false, error: "Documento no encontrado" }

  const application = Array.isArray(doc.application)
    ? doc.application[0]
    : doc.application
  if (!application) return { ok: false, error: "Legajo no encontrado" }

  const isAdmin = profile.role === "admin"
  const isAssignedOfficer = application.assigned_officer_id === user.id
  if (!isAdmin && !isAssignedOfficer) {
    return {
      ok: false,
      error: "Tenés que tomar el legajo primero antes de revisar sus documentos",
    }
  }

  if (doc.status !== "uploaded") {
    return {
      ok: false,
      error: `El documento está ${doc.status === "approved" ? "aprobado" : doc.status === "rejected" ? "ya rechazado" : "en un estado que no se puede rechazar"}`,
    }
  }

  const { error: updateErr } = await supabase
    .from("documents")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: parsed.data.reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.document_id)

  if (updateErr) return { ok: false, error: updateErr.message }

  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "document_rejected",
    entity_type: "documents",
    entity_id: parsed.data.document_id,
    old_value: { status: "uploaded" },
    new_value: {
      status: "rejected",
      document_type: doc.document_type,
      file_name: doc.file_name,
      application_number: application.application_number,
      reason: parsed.data.reason,
      rejected_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath(`/staff/legajo/${application.id}`)
  revalidatePath("/cliente")
  revalidatePath("/cliente/documentos")

  return { ok: true }
}

// ============================================================
// REVERTIR UNA REVISIÓN (volver a "uploaded")
// ============================================================
// Por si el oficial aprobó/rechazó por error. Solo admin o el oficial
// asignado pueden revertir. Queda log del revert.

const revertSchema = z.object({
  document_id: z.string().uuid(),
})

export async function revertDocumentReviewAction(
  input: z.infer<typeof revertSchema>
): Promise<ActionResult> {
  const parsed = revertSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Datos inválidos" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    return { ok: false, error: "Solo oficiales o admins" }
  }

  const { data: doc } = await supabase
    .from("documents")
    .select(
      `
        id,
        application_id,
        document_type,
        file_name,
        status,
        review_notes,
        application:applications!inner(id, application_number, assigned_officer_id)
      `
    )
    .eq("id", parsed.data.document_id)
    .single()

  if (!doc) return { ok: false, error: "Documento no encontrado" }

  const application = Array.isArray(doc.application)
    ? doc.application[0]
    : doc.application
  if (!application) return { ok: false, error: "Legajo no encontrado" }

  const isAdmin = profile.role === "admin"
  const isAssignedOfficer = application.assigned_officer_id === user.id
  if (!isAdmin && !isAssignedOfficer) {
    return { ok: false, error: "Tenés que tomar el legajo primero" }
  }

  if (doc.status !== "approved" && doc.status !== "rejected") {
    return { ok: false, error: "Solo se pueden revertir revisiones" }
  }

  const { error: updateErr } = await supabase
    .from("documents")
    .update({
      status: "uploaded",
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.document_id)

  if (updateErr) return { ok: false, error: updateErr.message }

  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "document_review_reverted",
    entity_type: "documents",
    entity_id: parsed.data.document_id,
    old_value: { status: doc.status, review_notes: doc.review_notes },
    new_value: {
      status: "uploaded",
      document_type: doc.document_type,
      file_name: doc.file_name,
      application_number: application.application_number,
      reverted_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath(`/staff/legajo/${application.id}`)
  revalidatePath("/cliente")
  revalidatePath("/cliente/documentos")

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
