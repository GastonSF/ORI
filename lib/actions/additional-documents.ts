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
      document_type: "otro_adicional",
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
// - Marca el documento como uploaded
// - Vincula con el request (status=fulfilled, fulfilled_by_document_id)
// - Si había un documento anterior cumpliendo este request, lo borra
//   (del storage y de la tabla) para evitar huérfanos al reemplazar

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

  // Validar ownership del documento nuevo
  const { data: newDoc, error: newDocErr } = await supabase
    .from("documents")
    .select("id, uploaded_by, application_id, file_path")
    .eq("id", parsed.data.document_id)
    .single()
  if (newDocErr || !newDoc) return { ok: false, error: "Documento no encontrado" }
  if (newDoc.uploaded_by !== user.id) return { ok: false, error: "No autorizado" }

  // Verificar que el archivo realmente fue subido al storage
  // (evita que confirmemos algo que nunca llegó)
  const fileDir = newDoc.file_path.substring(0, newDoc.file_path.lastIndexOf("/"))
  const fileName = newDoc.file_path.substring(newDoc.file_path.lastIndexOf("/") + 1)
  const { data: filesInDir } = await supabase.storage
    .from("documents")
    .list(fileDir, { search: fileName })

  const fileExists = filesInDir?.some((f) => f.name === fileName) ?? false
  if (!fileExists) {
    // El frontend nos dijo que subió, pero el archivo no está. Limpieza:
    await supabase.from("documents").delete().eq("id", parsed.data.document_id)
    return {
      ok: false,
      error: "El archivo no se subió correctamente al almacenamiento. Intentá de nuevo.",
    }
  }

  // Obtener el request y, si ya tenía un doc anterior, prepararnos para borrarlo
  const { data: request, error: reqGetErr } = await supabase
    .from("additional_document_requests")
    .select("id, application_id, fulfilled_by_document_id")
    .eq("id", parsed.data.request_id)
    .single()
  if (reqGetErr || !request) return { ok: false, error: "Pedido no encontrado" }

  // Consistencia: el nuevo doc tiene que ser de la misma application que el request
  if (request.application_id !== newDoc.application_id) {
    // Rollback: el doc está mal asociado. Borrarlo.
    await supabase.storage.from("documents").remove([newDoc.file_path])
    await supabase.from("documents").delete().eq("id", parsed.data.document_id)
    return { ok: false, error: "Inconsistencia: el documento no pertenece al legajo del pedido" }
  }

  const oldDocId = request.fulfilled_by_document_id

  // Paso 1: marcar el doc nuevo como uploaded
  const { error: docUpErr } = await supabase
    .from("documents")
    .update({ status: "uploaded", uploaded_at: new Date().toISOString() })
    .eq("id", parsed.data.document_id)
  if (docUpErr) return { ok: false, error: docUpErr.message }

  // Paso 2: linkear el request al nuevo doc (esto sobrescribe el fulfilled_by_document_id)
  const { error: reqErr } = await supabase
    .from("additional_document_requests")
    .update({
      status: "fulfilled",
      fulfilled_by_document_id: parsed.data.document_id,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.request_id)
  if (reqErr) return { ok: false, error: reqErr.message }

  // Paso 3: si había un doc anterior, borrarlo (evita huérfanos al reemplazar)
  if (oldDocId && oldDocId !== parsed.data.document_id) {
    const { data: oldDoc } = await supabase
      .from("documents")
      .select("id, file_path")
      .eq("id", oldDocId)
      .single()
    if (oldDoc) {
      // Best-effort: si falla el storage, igual borramos el row
      await supabase.storage.from("documents").remove([oldDoc.file_path])
      await supabase.from("documents").delete().eq("id", oldDoc.id)
    }
  }

  revalidatePath("/cliente")
  revalidatePath("/cliente/documentos")
  revalidatePath("/cliente/solicitud")

  return { ok: true }
}

// ============================================================
// ELIMINAR DOCUMENTO ADICIONAL
// ============================================================
// Borra el doc del storage + del table + marca el request como pending

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

  const { data: doc, error: docGetErr } = await supabase
    .from("documents")
    .select("id, uploaded_by, file_path, application_id")
    .eq("id", parsed.data.document_id)
    .single()
  if (docGetErr || !doc) return { ok: false, error: "Documento no encontrado" }
  if (doc.uploaded_by !== user.id) return { ok: false, error: "No autorizado" }

  // Validar consistencia: el request tiene que pertenecer a la misma application
  // y el request tiene que estar efectivamente vinculado a este documento.
  // Esto bloquea el caso donde por UI desfasada se intenta borrar un doc que
  // ya no es el que cumple el request (ej: hubo un replace intermedio).
  const { data: request, error: reqGetErr } = await supabase
    .from("additional_document_requests")
    .select("id, application_id, fulfilled_by_document_id")
    .eq("id", parsed.data.request_id)
    .single()
  if (reqGetErr || !request) return { ok: false, error: "Pedido no encontrado" }

  if (request.application_id !== doc.application_id) {
    return { ok: false, error: "Inconsistencia: el documento no pertenece al legajo del pedido" }
  }
  if (request.fulfilled_by_document_id !== doc.id) {
    return {
      ok: false,
      error: "Este archivo ya no está vinculado al pedido. Recargá la página e intentá de nuevo.",
    }
  }

  // Borrar archivo del storage (best-effort: si falla, lo logueamos pero seguimos)
  const { error: storageErr } = await supabase.storage
    .from("documents")
    .remove([doc.file_path])
  if (storageErr) {
    console.error("[deleteAdditionalDocument] Storage remove failed:", storageErr.message)
    // No abortamos: preferimos limpiar la DB aunque el archivo haya quedado en storage.
  }

  // Borrar registro del documento
  const { error: delErr } = await supabase
    .from("documents")
    .delete()
    .eq("id", parsed.data.document_id)
  if (delErr) return { ok: false, error: delErr.message }

  // Reabrir el request (último paso: si algo falla antes, el request queda
  // apuntando a un doc inexistente, pero es un estado detectable y corregible.
  // Si lo hiciéramos al revés, el doc quedaría huérfano sin forma de ubicarlo.)
  const { error: reqErr } = await supabase
    .from("additional_document_requests")
    .update({
      status: "pending",
      fulfilled_by_document_id: null,
      fulfilled_at: null,
    })
    .eq("id", parsed.data.request_id)
  if (reqErr) return { ok: false, error: reqErr.message }

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
