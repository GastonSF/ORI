"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type DocumentType,
  type FundingLine,
} from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

const STORAGE_BUCKET = "documents"
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

/**
 * Slots de archivos posibles dentro de un código de descuento.
 * Cada slot tiene un document_type asociado para guardar en la tabla documents.
 */
type CodeDocSlot =
  | "autorizacion_descuento"
  | "convenio_nivel_1"
  | "convenio_nivel_2"
  | "autorizacion_mutual_original"

const SLOT_TO_DOC_TYPE: { [K in CodeDocSlot]: DocumentType } = {
  autorizacion_descuento: "autorizacion_descuento",
  convenio_nivel_1: "convenio_terceros",
  convenio_nivel_2: "convenio_terceros",
  autorizacion_mutual_original: "autorizacion_descuento",
}

const SLOT_TO_COLUMN: { [K in CodeDocSlot]: string } = {
  autorizacion_descuento: "autorizacion_descuento_doc_id",
  convenio_nivel_1: "convenio_nivel_1_doc_id",
  convenio_nivel_2: "convenio_nivel_2_doc_id",
  autorizacion_mutual_original: "autorizacion_mutual_original_doc_id",
}

const SLOT_LABELS: { [K in CodeDocSlot]: string } = {
  autorizacion_descuento: "Autorización de descuento",
  convenio_nivel_1: "Convenio nivel 1",
  convenio_nivel_2: "Convenio nivel 2",
  autorizacion_mutual_original: "Autorización mutual original",
}

// ============================================================
// 1. PREPARE: pedir URL firmada para subir el archivo
// ============================================================
/**
 * Genera una URL firmada para que el cliente suba un archivo directo
 * a Supabase Storage. Crea la fila en documents con status='uploaded'
 * después de la subida (eso lo hace confirmCodeDocUpload).
 *
 * Devuelve:
 *   - upload_url: URL firmada para PUT (válida por 1 hora)
 *   - document_id: UUID que el cliente usa después en confirm
 *   - file_path: ruta donde quedó guardado (para auditoría)
 */
export async function prepareCodeDocUploadAction(input: {
  code_id: string
  slot: CodeDocSlot
  file_name: string
  file_size: number
  mime_type: string
}): Promise
  ActionResult<{
    document_id: string
    upload_url: string
    file_path: string
  }>
> {
  if (input.file_size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `El archivo es demasiado grande (máximo 25 MB)`,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Obtener el código y validar dueño
  const { data: code, error: codeErr } = await supabase
    .from("collection_codes")
    .select(
      `
        id,
        application_id,
        application:applications!inner(
          id,
          status,
          funding_line,
          client:clients!inner(id, owner_user_id)
        )
      `
    )
    .eq("id", input.code_id)
    .single()

  if (codeErr || !code) {
    return { ok: false, error: "Código no encontrado" }
  }

  const app = Array.isArray(code.application) ? code.application[0] : code.application
  if (!app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (!client || client.owner_user_id !== user.id) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés subir archivos",
    }
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    return { ok: false, error: "El árbol de cobranza solo aplica a FGPlus" }
  }

  // Generar paths
  const slotLabel = SLOT_LABELS[input.slot]
  const docType = SLOT_TO_DOC_TYPE[input.slot]
  const safeFileName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filePath = `applications/${app.id}/codes/${input.code_id}/${input.slot}_${Date.now()}_${safeFileName}`

  // Crear la fila en documents (status uploaded - el archivo va a llegar enseguida)
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      application_id: app.id,
      client_id: client.id,
      document_type: docType,
      doc_phase: "additional",
      file_path: filePath,
      file_name: `${slotLabel} - ${input.file_name}`,
      file_size_bytes: input.file_size,
      mime_type: input.mime_type,
      status: "uploaded",
      uploaded_by: user.id,
      uploaded_on_behalf_by_staff: false,
    })
    .select("id")
    .single()

  if (docErr || !doc) {
    return {
      ok: false,
      error: `Error creando registro: ${docErr?.message ?? "desconocido"}`,
    }
  }

  // Generar URL firmada para upload
  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(filePath)

  if (signErr || !signed) {
    // Rollback: borrar la fila creada
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
// 2. CONFIRM: confirmar la subida y linkear al slot del código
// ============================================================
/**
 * Después de que el cliente subió el archivo a la URL firmada,
 * esta action linkea el document_id al slot correspondiente
 * en collection_codes (autorizacion_descuento_doc_id, etc).
 *
 * Si el slot ya tenía un document anterior asociado, lo elimina
 * (es un reemplazo, no una versión nueva como en el flujo de docs iniciales).
 */
export async function confirmCodeDocUploadAction(input: {
  code_id: string
  slot: CodeDocSlot
  document_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const column = SLOT_TO_COLUMN[input.slot]
  if (!column) {
    return { ok: false, error: `Slot inválido: ${input.slot}` }
  }

  // Validar dueño + obtener doc anterior (si lo hay) para eliminarlo
  const { data: code, error: codeErr } = await supabase
    .from("collection_codes")
    .select(
      `
        id,
        application_id,
        autorizacion_descuento_doc_id,
        convenio_nivel_1_doc_id,
        convenio_nivel_2_doc_id,
        autorizacion_mutual_original_doc_id,
        application:applications!inner(
          status,
          client:clients!inner(owner_user_id)
        )
      `
    )
    .eq("id", input.code_id)
    .single()

  if (codeErr || !code) {
    return { ok: false, error: "Código no encontrado" }
  }

  const app = Array.isArray(code.application) ? code.application[0] : code.application
  if (!app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (!client || client.owner_user_id !== user.id) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés subir archivos",
    }
  }

  // Si ya había un doc en este slot, eliminarlo (reemplazo)
  const previousDocIdMap: Record<CodeDocSlot, string | null> = {
    autorizacion_descuento: code.autorizacion_descuento_doc_id,
    convenio_nivel_1: code.convenio_nivel_1_doc_id,
    convenio_nivel_2: code.convenio_nivel_2_doc_id,
    autorizacion_mutual_original: code.autorizacion_mutual_original_doc_id,
  }
  const previousDocId = previousDocIdMap[input.slot]

  if (previousDocId && previousDocId !== input.document_id) {
    // Borrar el archivo anterior del storage y la tabla
    const { data: oldDoc } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", previousDocId)
      .single()
    if (oldDoc?.file_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([oldDoc.file_path])
    }
    await supabase.from("documents").delete().eq("id", previousDocId)
  }

  // Linkear el nuevo doc al slot
  const updateData: Record<string, unknown> = {
    [column]: input.document_id,
    updated_at: new Date().toISOString(),
  }

  const { error: updateErr } = await supabase
    .from("collection_codes")
    .update(updateData)
    .eq("id", input.code_id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error linkeando archivo: ${updateErr.message}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true }
}

// ============================================================
// 3. DELETE: eliminar un archivo de un slot del código
// ============================================================
/**
 * Elimina el archivo de un slot específico del código (sin borrar el código).
 * Saca el archivo del storage, lo borra de la tabla documents, y limpia
 * la columna correspondiente en collection_codes.
 */
export async function deleteCodeDocumentAction(input: {
  code_id: string
  slot: CodeDocSlot
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const column = SLOT_TO_COLUMN[input.slot]
  if (!column) {
    return { ok: false, error: `Slot inválido: ${input.slot}` }
  }

  const { data: code, error: codeErr } = await supabase
    .from("collection_codes")
    .select(
      `
        id,
        application_id,
        autorizacion_descuento_doc_id,
        convenio_nivel_1_doc_id,
        convenio_nivel_2_doc_id,
        autorizacion_mutual_original_doc_id,
        application:applications!inner(
          status,
          client:clients!inner(owner_user_id)
        )
      `
    )
    .eq("id", input.code_id)
    .single()

  if (codeErr || !code) {
    return { ok: false, error: "Código no encontrado" }
  }

  const app = Array.isArray(code.application) ? code.application[0] : code.application
  if (!app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (!client || client.owner_user_id !== user.id) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés eliminar archivos",
    }
  }

  // Obtener el doc_id actual del slot
  const docIdMap: Record<CodeDocSlot, string | null> = {
    autorizacion_descuento: code.autorizacion_descuento_doc_id,
    convenio_nivel_1: code.convenio_nivel_1_doc_id,
    convenio_nivel_2: code.convenio_nivel_2_doc_id,
    autorizacion_mutual_original: code.autorizacion_mutual_original_doc_id,
  }
  const docId = docIdMap[input.slot]

  if (!docId) {
    return { ok: false, error: "No hay archivo para eliminar" }
  }

  // Borrar del storage
  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", docId)
    .single()

  if (doc?.file_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_path])
  }

  // Borrar de la tabla
  await supabase.from("documents").delete().eq("id", docId)

  // Limpiar la columna en collection_codes
  const updateData: Record<string, unknown> = {
    [column]: null,
    updated_at: new Date().toISOString(),
  }

  const { error: updateErr } = await supabase
    .from("collection_codes")
    .update(updateData)
    .eq("id", input.code_id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error limpiando referencia: ${updateErr.message}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true }
}
