"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

// ============================================================
// PREPARAR UPLOAD DE UN DOCUMENTO ADICIONAL
// ============================================================
// Genera signed URL para que el cliente suba directo a Supabase Storage
// (evitamos pasar por Vercel para no chocar con el límite de 4.5MB)

const prepareSchema = z.object({
  application_id: z.string().uuid(),
  request_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_size: z.number().positive(),
  mime_type: z.string().min(1),
})

type PrepareInput = z.infer<typeof prepareSchema>

type PrepareResult = {
  upload_url: string
  upload_token: string
  file_path: string
  document_id: string
}

export async function prepareAdditionalDocumentUploadAction(
  input: PrepareInput
): Promise<ActionResult<PrepareResult>> {
  const parsed = prepareSchema.safeParse(input)
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

  // Validar que el request existe, pertenece a una app del usuario, y está pending
  const { data: request } = await supabase
    .from("additional_document_requests")
    .select(
      "id, application_id, status, document_name, applications!inner(client_id, clients!inner(id, owner_user_id))"
    )
    .eq("id", parsed.data.request_id)
    .single()

  if (!request) return { ok: false, error: "Pedido de documento no encontrado" }

  const apps = Array.isArray(request.applications)
    ? request.applications[0]
    : (request.applications as { client_id: string; clients: { id: string; owner_user_id: string } | { id: string; owner_user_id: string }[] })
  const clients = Array.isArray(apps.clients) ? apps.clients[0] : apps.clients
  if (clients.owner_user_id !== user.id) {
    return { ok: false, error: "No autorizado" }
  }

  if (request.application_id !== parsed.data.application_id) {
    return { ok: false, error: "El pedido no pertenece a este legajo" }
  }

  // Sanear el nombre del archivo
  const safeName = parsed.data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const timestamp = Date.now()
  const filePath = `clients/${clients.id}/${parsed.data.application_id}/additional/${parsed.data.request_id}/${timestamp}_${safeName}`

  // Crear signed URL
  const { data: signed, error: signedError } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(filePath)

  if (signedError || !signed) {
    return { ok: false, error: signedError?.message ?? "Error generando URL" }
  }

  // Crear registro placeholder en documents (status=pending hasta que confirme)
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      application_id: parsed.data.application_id,
      client_id: clients.id,
      document_type: "otro_adicional", // se sobreescribe en confirmación si hace falta
      doc_phase: "additional",
      file_path: filePath,
      file_name: parsed.data.file_name,
      file_size_bytes: parsed.data.file_size,
      mime_type: parsed.data.mime_type,
      status: "pending",
      uploaded_by: user.id,
    })
    .select("id")
    .single()

  if (docErr || !doc) {
    return { ok: false, error: docErr?.message ?? "Error creando registro de documento" }
  }

  return {
    ok: true,
    data: {
      upload_url: signed.signedUrl,
      upload_token: signed.token,
      file_path: filePath,
      document_id: doc.id,
    },
  }
}

// ============================================================
// CONFIRMAR UPLOAD DE UN DOCUMENTO ADICIONAL
// ============================================================
// Se llama después de que el cliente subió el archivo al Storage:
// marca el documento como uploaded y vincula con el request

const confirmSchema = z.object({
  document_id: z.string().uuid(),
  request_id: z.string().uuid(),
})

type ConfirmInput = z.infer<typeof confirmSchema>

export async function confirmAdditionalDocumentUploadAction(
  input: ConfirmInput
): Promise<ActionResult> {
  const parsed = confirmSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar ownership del documento
  const { data: doc } = await supabase
    .from("documents")
    .select("id, uploaded_by, application_id")
    .eq("id", parsed.data.document_id)
    .single()
  if (!doc) return { ok: false, error: "Documento no encontrado" }
  if (doc.uploaded_by !== user.id) return { ok: false, error: "No autorizado" }

  // Marcar el doc como uploaded
  const { error: docErr } = await supabase
    .from("documents")
    .update({ status: "uploaded", uploaded_at: new Date().toISOString() })
    .eq("id", parsed.data.document_id)

  if (docErr) return { ok: false, error: docErr.message }

  // Linkear el request: status=fulfilled + fulfilled_by_document_id
  const { error: reqErr } = await supabase
    .from("additional_document_requests")
    .update({
      status: "fulfilled",
      fulfilled_by_document_id: parsed.data.document_id,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.request_id)

  if (reqErr) return { ok: false, error: reqErr.message }

  revalidatePath("/cliente")
  revalidatePath("/cliente/documentos")
  revalidatePath("/cliente/solicitud")

  return { ok: true }
}

// ============================================================
// ELIMINAR / REEMPLAZAR DOCUMENTO ADICIONAL
// ============================================================
// Borra el doc del storage + marca el request como pending de nuevo

const deleteSchema = z.object({
  document_id: z.string().uuid(),
  request_id: z.string().uuid(),
})

export async function deleteAdditionalDocumentAction(
  input: z.infer<typeof deleteSchema>
): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, uploaded_by, file_path")
    .eq("id", parsed.data.document_id)
    .single()
  if (!doc) return { ok: false, error: "Documento no encontrado" }
  if (doc.uploaded_by !== user.id) return { ok: false, error: "No autorizado" }

  // Borrar archivo del storage
  await supabase.storage.from("documents").remove([doc.file_path])

  // Borrar registro del documento
  await supabase.from("documents").delete().eq("id", parsed.data.document_id)

  // Reabrir el request
  await supabase
    .from("additional_document_requests")
    .update({
      status: "pending",
      fulfilled_by_document_id: null,
      fulfilled_at: null,
    })
    .eq("id", parsed.data.request_id)

  revalidatePath("/cliente")
  revalidatePath("/cliente/documentos")
  revalidatePath("/cliente/solicitud")

  return { ok: true }
}

// ============================================================
// OBTENER URL FIRMADA PARA VER UN DOC YA SUBIDO
// ============================================================

export async function getAdditionalDocumentSignedUrlAction(
  document_id: string
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path, uploaded_by")
    .eq("id", document_id)
    .single()
  if (!doc) return { ok: false, error: "Documento no encontrado" }
  if (doc.uploaded_by !== user.id) return { ok: false, error: "No autorizado" }

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 120)

  if (error || !signed) {
    return { ok: false, error: error?.message ?? "Error generando URL" }
  }

  return { ok: true, data: { url: signed.signedUrl } }
}
