"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ============================================================
// RE-SUBIR UN DOCUMENTO RECHAZADO (cliente)
// ============================================================

const schema = z.object({
  rejected_document_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  mime_type: z.string().min(1),
})

type Input = z.infer<typeof schema>

export async function reUploadRejectedDocAction(
  input: Input
): Promise<ActionResult<{ new_document_id: string }>> {
  const parsed = schema.safeParse(input)
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
  if (profile.role !== "client") {
    return { ok: false, error: "Solo el cliente puede re-subir sus documentos" }
  }

  const { data: rejectedDoc, error: docErr } = await supabase
    .from("documents")
    .select(
      `
        id,
        application_id,
        client_id,
        document_type,
        doc_phase,
        status,
        review_notes,
        client:clients!inner(
          id,
          owner_user_id
        ),
        application:applications!inner(
          id,
          application_number
        )
      `
    )
    .eq("id", parsed.data.rejected_document_id)
    .single()

  if (docErr || !rejectedDoc) {
    return { ok: false, error: "Documento no encontrado" }
  }

  const docClient = Array.isArray(rejectedDoc.client)
    ? rejectedDoc.client[0]
    : rejectedDoc.client
  if (!docClient || docClient.owner_user_id !== user.id) {
    return {
      ok: false,
      error: "No tenés permiso para re-subir este documento",
    }
  }

  if (rejectedDoc.status !== "rejected") {
    return {
      ok: false,
      error: `Este documento no está rechazado (está ${rejectedDoc.status})`,
    }
  }

  const application = Array.isArray(rejectedDoc.application)
    ? rejectedDoc.application[0]
    : rejectedDoc.application

  const { data: existingReplacement } = await supabase
    .from("documents")
    .select("id")
    .eq("source_document_id", parsed.data.rejected_document_id)
    .maybeSingle()

  if (existingReplacement) {
    return {
      ok: false,
      error:
        "Ya subiste una versión nueva de este documento. Refrescá la página para verla.",
    }
  }

  const { data: newDoc, error: insertErr } = await supabase
    .from("documents")
    .insert({
      application_id: rejectedDoc.application_id,
      client_id: rejectedDoc.client_id,
      document_type: rejectedDoc.document_type,
      doc_phase: rejectedDoc.doc_phase,
      file_path: parsed.data.file_path,
      file_name: parsed.data.file_name,
      file_size_bytes: parsed.data.file_size_bytes,
      mime_type: parsed.data.mime_type,
      status: "uploaded",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      source_document_id: parsed.data.rejected_document_id,
    })
    .select("id")
    .single()

  if (insertErr || !newDoc) {
    return {
      ok: false,
      error: insertErr?.message ?? "No pudimos registrar el documento",
    }
  }

  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: profile.role,
    action: "document_re_uploaded_after_rejection",
    entity_type: "documents",
    entity_id: newDoc.id,
    old_value: {
      source_document_id: parsed.data.rejected_document_id,
      previous_status: "rejected",
      previous_review_notes: rejectedDoc.review_notes,
    },
    new_value: {
      new_document_id: newDoc.id,
      application_id: rejectedDoc.application_id,
      application_number: application?.application_number ?? null,
      document_type: rejectedDoc.document_type,
      file_name: parsed.data.file_name,
      uploaded_by_name: profile.full_name,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  revalidatePath("/cliente")
  revalidatePath("/cliente/documentos")
  revalidatePath(`/staff/legajo/${rejectedDoc.application_id}`)

  return { ok: true, data: { new_document_id: newDoc.id } }
}

// ============================================================
// LISTAR DOCS RECHAZADOS DEL CLIENTE (activos, sin reemplazo)
// ============================================================

type RejectedDocActive = {
  id: string
  application_id: string
  application_number: string
  document_type: string
  file_name: string
  review_notes: string | null
  reviewed_at: string | null
}

export async function getActiveRejectedDocsAction(): Promise
  ActionResult<RejectedDocActive[]>
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!clientRow) {
    return { ok: true, data: [] }
  }

  const { data, error } = await supabase
    .from("documents")
    .select(
      `
        id,
        application_id,
        document_type,
        file_name,
        review_notes,
        reviewed_at,
        application:applications!inner(application_number),
        replacements:documents!documents_source_document_id_fkey(id)
      `
    )
    .eq("client_id", clientRow.id)
    .eq("status", "rejected")
    .order("reviewed_at", { ascending: false })

  if (error) return { ok: false, error: error.message }

  const active = (data ?? []).filter((d) => {
    const reps = Array.isArray(d.replacements) ? d.replacements : []
    return reps.length === 0
  })

  const result: RejectedDocActive[] = active.map((d) => {
    const app = Array.isArray(d.application) ? d.application[0] : d.application
    return {
      id: d.id,
      application_id: d.application_id,
      application_number: app?.application_number ?? "",
      document_type: d.document_type as string,
      file_name: d.file_name,
      review_notes: d.review_notes as string | null,
      reviewed_at: d.reviewed_at as string | null,
    }
  })

  return { ok: true, data: result }
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
