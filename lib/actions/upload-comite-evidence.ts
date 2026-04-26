"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

const STORAGE_BUCKET = "documents"
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

type PrepareUploadData = {
  document_id: string
  upload_url: string
  file_path: string
}

type PrepareUploadResult = ActionResult<PrepareUploadData>

/**
 * Sube el comprobante del comité de riesgo (ej: screenshot del mail).
 *
 * Flujo:
 *   1. PREPARE: el analista pide URL firmada → crea fila en documents con
 *      doc_phase='comite' y devuelve la URL para subir el archivo.
 *   2. El cliente (analista) sube el archivo a esa URL firmada.
 *   3. CONFIRM: el analista confirma → linkea el document_id al
 *      dictamen.comite_evidence_doc_id.
 *
 * Solo el analista o admin pueden ejecutar estas actions.
 */

// ============================================================
// 1. PREPARE
// ============================================================
export async function prepareComiteEvidenceUploadAction(input: {
  application_id: string
  file_name: string
  file_size: number
  mime_type: string
}): Promise<PrepareUploadResult> {
  if (input.file_size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: "El archivo es demasiado grande (máximo 10 MB)",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar que el usuario es analista o admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return { ok: false, error: "Perfil no encontrado" }
  if (profile.role !== "analyst" && profile.role !== "admin") {
    return {
      ok: false,
      error: "Solo el analista o admin pueden subir comprobantes del comité",
    }
  }

  // Validar que la application existe
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("id, client_id")
    .eq("id", input.application_id)
    .single()

  if (appErr || !app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  // Generar path: dictamenes/{app_id}/comite_evidence_{ts}_{filename}
  const safeFileName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filePath = `dictamenes/${app.id}/comite_evidence_${Date.now()}_${safeFileName}`

  // Crear la fila en documents
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      application_id: app.id,
      client_id: app.client_id,
      document_type: "comite_evidence",
      doc_phase: "comite",
      file_path: filePath,
      file_name: input.file_name,
      file_size_bytes: input.file_size,
      mime_type: input.mime_type,
      status: "uploaded",
      uploaded_by: user.id,
      uploaded_on_behalf_by_staff: true,
    })
    .select("id")
    .single()

  if (docErr || !doc) {
    return {
      ok: false,
      error: `Error creando registro: ${docErr?.message ?? "desconocido"}`,
    }
  }

  // Generar URL firmada
  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(filePath)

  if (signErr || !signed) {
    // Rollback
    await supabase.from("documents").delete().eq("id", doc.id)
    return {
      ok: false,
      error: `Error generando URL: ${signErr?.message ?? "desconocido"}`,
    }
  }

  return {
    ok: true,
    data: {
      document_id: doc.id,
      upload_url: signed.signedUrl,
      file_path: filePath,
    },
  }
}

// ============================================================
// 2. CONFIRM (linkear al dictamen)
// ============================================================
export async function confirmComiteEvidenceUploadAction(input: {
  application_id: string
  document_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return { ok: false, error: "Perfil no encontrado" }
  if (profile.role !== "analyst" && profile.role !== "admin") {
    return {
      ok: false,
      error: "Solo el analista o admin pueden subir comprobantes del comité",
    }
  }

  // Buscar el dictamen existente para esta application
  const { data: dictamen } = await supabase
    .from("dictamenes")
    .select("id, comite_evidence_doc_id")
    .eq("application_id", input.application_id)
    .maybeSingle()

  if (!dictamen) {
    // Si todavía no existe el dictamen (analista todavía no lo guardó),
    // no podemos linkear. El componente se va a encargar de pasar el doc_id
    // al form para que se incluya en el insert/update del dictamen.
    return {
      ok: true, // No fallamos: el linkeo va a pasar al guardar el dictamen
    }
  }

  // Si ya había un comprobante, eliminarlo (reemplazo)
  if (
    dictamen.comite_evidence_doc_id &&
    dictamen.comite_evidence_doc_id !== input.document_id
  ) {
    const { data: oldDoc } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", dictamen.comite_evidence_doc_id)
      .single()
    if (oldDoc?.file_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([oldDoc.file_path])
    }
    await supabase.from("documents").delete().eq("id", dictamen.comite_evidence_doc_id)
  }

  // Linkear el nuevo doc al dictamen
  const { error: updateErr } = await supabase
    .from("dictamenes")
    .update({
      comite_evidence_doc_id: input.document_id,
      last_edited_at: new Date().toISOString(),
      last_edited_by: user.id,
    })
    .eq("id", dictamen.id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error linkeando comprobante: ${updateErr.message}`,
    }
  }

  revalidatePath(`/staff/legajo/${input.application_id}`)
  return { ok: true }
}

// ============================================================
// 3. DELETE
// ============================================================
export async function deleteComiteEvidenceAction(input: {
  application_id: string
  document_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return { ok: false, error: "Perfil no encontrado" }
  if (profile.role !== "analyst" && profile.role !== "admin") {
    return {
      ok: false,
      error: "Solo el analista o admin pueden eliminar comprobantes",
    }
  }

  // Obtener el doc para borrar el archivo
  const { data: doc } = await supabase
    .from("documents")
    .select("file_path, application_id")
    .eq("id", input.document_id)
    .single()

  if (!doc) {
    return { ok: false, error: "Documento no encontrado" }
  }

  if (doc.application_id !== input.application_id) {
    return { ok: false, error: "El documento no pertenece a este legajo" }
  }

  // Limpiar referencia en dictamen (si existe)
  await supabase
    .from("dictamenes")
    .update({
      comite_evidence_doc_id: null,
      last_edited_at: new Date().toISOString(),
      last_edited_by: user.id,
    })
    .eq("application_id", input.application_id)
    .eq("comite_evidence_doc_id", input.document_id)

  // Borrar del storage
  if (doc.file_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_path])
  }

  // Borrar de la tabla
  await supabase.from("documents").delete().eq("id", input.document_id)

  revalidatePath(`/staff/legajo/${input.application_id}`)
  return { ok: true }
}
