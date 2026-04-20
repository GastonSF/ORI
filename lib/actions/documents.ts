"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  documentUploadMetadataSchema,
  type DocumentUploadMetadataInput,
} from "@/lib/validators/schemas"
import {
  buildDocumentPath,
  isAllowedMimeType,
  MAX_FILE_SIZE_BYTES,
  getSignedDocumentUrl,
} from "@/lib/supabase/storage"
import type { DocumentType } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function uploadDocumentAction(formData: FormData): Promise<ActionResult<{ document_id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const file = formData.get("file") as File | null
  const metadataRaw = formData.get("metadata") as string | null
  if (!file || !metadataRaw) return { ok: false, error: "Faltan el archivo o la metadata" }

  if (file.size > MAX_FILE_SIZE_BYTES) return { ok: false, error: "El archivo supera los 25 MB permitidos" }
  if (!isAllowedMimeType(file.type)) {
    return { ok: false, error: "Tipo de archivo no permitido. Aceptamos PDF, imágenes y documentos Office." }
  }

  let metadata: DocumentUploadMetadataInput
  try {
    metadata = JSON.parse(metadataRaw)
  } catch {
    return { ok: false, error: "Metadata malformada" }
  }

  const parsed = documentUploadMetadataSchema.safeParse(metadata)
  if (!parsed.success) {
    return { ok: false, error: "Metadata inválida", fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { data: app } = await supabase
    .from("applications")
    .select("id, client_id, status, clients!inner(owner_user_id)")
    .eq("id", parsed.data.application_id)
    .single()

  if (!app) return { ok: false, error: "Legajo no encontrado" }
  if (app.client_id !== parsed.data.client_id) return { ok: false, error: "El legajo no corresponde a ese cliente" }

  const ownerId = Array.isArray(app.clients)
    ? app.clients[0]?.owner_user_id
    : (app.clients as { owner_user_id: string })?.owner_user_id
  if (ownerId !== user.id) return { ok: false, error: "No autorizado" }

  const blockedStatuses = ["in_risk_analysis","approved","rejected_by_officer","rejected_by_analyst","cancelled_by_client","cancelled_by_worcap"]
  if (blockedStatuses.includes(app.status)) {
    return { ok: false, error: "El legajo ya no acepta nueva documentación" }
  }

  const filePath = buildDocumentPath({
    clientId: parsed.data.client_id,
    applicationId: parsed.data.application_id,
    documentType: parsed.data.document_type as DocumentType,
    originalFileName: parsed.data.file_name,
  })

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage
    .from("documents")
    .upload(filePath, arrayBuffer, { contentType: parsed.data.mime_type, upsert: false })

  if (uploadErr) return { ok: false, error: `Error al subir archivo: ${uploadErr.message}` }

  await supabase.from("documents").delete()
    .eq("application_id", parsed.data.application_id)
    .eq("document_type", parsed.data.document_type)

  const { data: doc, error: insertErr } = await supabase
    .from("documents")
    .insert({
      application_id: parsed.data.application_id,
      client_id: parsed.data.client_id,
      document_type: parsed.data.document_type,
      file_path: filePath,
      file_name: parsed.data.file_name,
      file_size_bytes: parsed.data.file_size_bytes,
      mime_type: parsed.data.mime_type,
      status: "uploaded",
      uploaded_by: user.id,
    })
    .select("id")
    .single()

  if (insertErr || !doc) {
    await supabase.storage.from("documents").remove([filePath])
    return { ok: false, error: `Error al registrar documento: ${insertErr?.message ?? "desconocido"}` }
  }

  revalidatePath("/cliente/documentos")
  revalidatePath("/cliente/onboarding")
  return { ok: true, data: { document_id: doc.id } }
}

export async function deleteDocumentAction(input: { document_id: string }): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_path, status, clients!inner(owner_user_id)")
    .eq("id", input.document_id)
    .single()

  if (!doc) return { ok: false, error: "Documento no encontrado" }

  const ownerId = Array.isArray(doc.clients)
    ? doc.clients[0]?.owner_user_id
    : (doc.clients as { owner_user_id: string })?.owner_user_id
  if (ownerId !== user.id) return { ok: false, error: "No autorizado" }

  if (doc.status === "approved") return { ok: false, error: "Este documento ya fue aprobado y no se puede eliminar" }

  await supabase.storage.from("documents").remove([doc.file_path])
  const { error } = await supabase.from("documents").delete().eq("id", input.document_id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/cliente/documentos")
  return { ok: true }
}

export async function getDocumentSignedUrlAction(input: { document_id: string }): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_path")
    .eq("id", input.document_id)
    .single()

  if (!doc) return { ok: false, error: "Documento no encontrado" }

  const url = await getSignedDocumentUrl(doc.file_path, 120)
  if (!url) return { ok: false, error: "No pudimos generar el enlace" }

  return { ok: true, data: { url } }
}
