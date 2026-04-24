"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ============================================================
// SUBIR UN DOCUMENTO EN NOMBRE DEL CLIENTE (solo oficial asignado)
// ============================================================
// Usado cuando un cliente le pasa documentación al oficial por fuera
// de la plataforma (WhatsApp, mail) y el oficial la carga manualmente.
//
// Reglas:
//  - Solo oficial o admin pueden usar esta action.
//  - El oficial DEBE estar asignado al legajo (pool abierto + trazabilidad:
//    si querés trabajar el legajo, tomalo primero). Admin puede sin tomarlo.
//  - Se guarda uploaded_on_behalf_by_staff = true para trazabilidad.
//  - uploaded_by apunta al staff (no al cliente) — transparencia total.
//  - Queda registrado en audit_log con motivo + IP + user-agent.

const uploadSchema = z.object({
  application_id: z.string().uuid(),
  document_type: z.string().min(1),
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1), // ya subido a Storage por el cliente
  file_size_bytes: z.number().int().positive(),
  mime_type: z.string().min(1),
  motivo: z
    .string()
    .trim()
    .min(10, "El motivo tiene que tener al menos 10 caracteres")
    .max(500),
})

type UploadInput = z.infer<typeof uploadSchema>

export async function uploadDocumentAsStaffAction(
  input: UploadInput
): Promise<ActionResult<{ document_id: string }>> {
  const parsed = uploadSchema.safeParse(input)
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

  // Validar rol
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
      error: "Solo oficiales o admins pueden subir docs en nombre del cliente",
    }
  }

  // Validar legajo + que el oficial esté asignado (admin puede sin asignación)
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("id, client_id, assigned_officer_id, application_number")
    .eq("id", parsed.data.application_id)
    .single()

  if (appErr || !app) return { ok: false, error: "Legajo no encontrado" }

  const isAdmin = profile.role === "admin"
  const isAssignedOfficer = app.assigned_officer_id === user.id
  if (!isAdmin && !isAssignedOfficer) {
    return {
      ok: false,
      error:
        "Tenés que tomar el legajo primero antes de subir documentación del cliente",
    }
  }

  // Insertar el documento con el flag de "en nombre del cliente"
  const { data: newDoc, error: insertErr } = await supabase
    .from("documents")
    .insert({
      application_id: parsed.data.application_id,
      client_id: app.client_id,
      document_type: parsed.data.document_type,
      doc_phase: "initial",
      file_path: parsed.data.file_path,
      file_name: parsed.data.file_name,
      file_size_bytes: parsed.data.file_size_bytes,
      mime_type: parsed.data.mime_type,
      status: "uploaded",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      uploaded_on_behalf_by_staff: true,
    })
    .select("id")
    .single()

  if (insertErr || !newDoc) {
    return {
      ok: false,
      error: insertErr?.message ?? "No pudimos registrar el documento",
    }
  }

  // Log de auditoría
  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "document_uploaded_on_behalf_of_client",
    entity_type: "documents",
    entity_id: newDoc.id,
    old_value: null,
    new_value: {
      application_id: parsed.data.application_id,
      document_type: parsed.data.document_type,
      file_name: parsed.data.file_name,
      file_size_bytes: parsed.data.file_size_bytes,
      motivo: parsed.data.motivo.trim(),
      uploaded_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath(`/staff/legajo/${parsed.data.application_id}`)
  revalidatePath("/staff")

  return { ok: true, data: { document_id: newDoc.id } }
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
