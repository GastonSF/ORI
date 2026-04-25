"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  COLLECTION_CODE_OWNERSHIPS,
  type CollectionCodeOwnership,
  type FundingLine,
} from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ============================================================
// Helpers compartidos
// ============================================================

/**
 * Valida que el usuario es dueño del legajo y que el legajo está
 * en un estado donde se puede modificar el árbol de cobranza.
 */
async function validateOwnership(applicationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, error: "No autenticado" }
  }

  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select(
      `
        id,
        status,
        funding_line,
        client:clients!inner(owner_user_id)
      `
    )
    .eq("id", applicationId)
    .single()

  if (appErr || !app) {
    return { ok: false as const, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (client?.owner_user_id !== user.id) {
    return { ok: false as const, error: "Este legajo no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false as const,
      error: "El pedido ya fue enviado, no podés modificar los códigos",
    }
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    return {
      ok: false as const,
      error: "El árbol de cobranza solo aplica a FGPlus",
    }
  }

  return { ok: true as const, supabase, userId: user.id }
}

// ============================================================
// 1. ADD: crear un código vacío
// ============================================================
/**
 * Crea un código nuevo (vacío) en el árbol de cobranza.
 * El cliente después completa nombre, ownership, cedentes y archivos.
 */
export async function addCollectionCodeAction(input: {
  application_id: string
}): Promise<ActionResult<{ code_id: string }>> {
  const ctx = await validateOwnership(input.application_id)
  if (!ctx.ok) return ctx

  const { data: newCode, error: insertErr } = await ctx.supabase
    .from("collection_codes")
    .insert({
      application_id: input.application_id,
      code_name: "",
      ownership: "propio", // default — el cliente cambia después
      is_excluded: false,
    })
    .select("id")
    .single()

  if (insertErr || !newCode) {
    return {
      ok: false,
      error: `Error creando código: ${insertErr?.message ?? "desconocido"}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true, data: { code_id: newCode.id } }
}

// ============================================================
// 2. UPDATE: editar un código (nombre, ownership, cedentes)
// ============================================================
/**
 * Actualiza los campos editables de un código.
 * Si cambia el ownership, los doc_ids de los slots que ya no aplican
 * NO se borran (quedan huérfanos referenciados desde la fila pero ignorados
 * en la UI). Eso permite recuperarlos si el cliente vuelve a cambiar de
 * opinión. Para borrar definitivamente, el cliente borra el código entero.
 */
export async function updateCollectionCodeAction(input: {
  code_id: string
  code_name?: string
  ownership?: CollectionCodeOwnership
  cedente_nivel_1_name?: string | null
  cedente_nivel_2_name?: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Obtener el application_id del código
  const { data: code, error: codeErr } = await supabase
    .from("collection_codes")
    .select(
      `
        id,
        application_id,
        application:applications!inner(
          status,
          funding_line,
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
  if (client?.owner_user_id !== user.id) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés modificar los códigos",
    }
  }

  // Validar ownership si se está cambiando
  if (input.ownership !== undefined) {
    if (!COLLECTION_CODE_OWNERSHIPS.includes(input.ownership)) {
      return { ok: false, error: `Ownership inválido: ${input.ownership}` }
    }
  }

  // Validar nombre si se está cambiando
  if (input.code_name !== undefined && input.code_name.length > 100) {
    return { ok: false, error: "El nombre del código es muy largo (máximo 100)" }
  }
  if (
    input.cedente_nivel_1_name !== undefined &&
    input.cedente_nivel_1_name !== null &&
    input.cedente_nivel_1_name.length > 100
  ) {
    return { ok: false, error: "El nombre del cedente nivel 1 es muy largo" }
  }
  if (
    input.cedente_nivel_2_name !== undefined &&
    input.cedente_nivel_2_name !== null &&
    input.cedente_nivel_2_name.length > 100
  ) {
    return { ok: false, error: "El nombre del cedente nivel 2 es muy largo" }
  }

  // Construir el update solo con los campos provistos
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.code_name !== undefined) {
    updateData.code_name = input.code_name.trim()
  }
  if (input.ownership !== undefined) {
    updateData.ownership = input.ownership
  }
  if (input.cedente_nivel_1_name !== undefined) {
    updateData.cedente_nivel_1_name = input.cedente_nivel_1_name?.trim() || null
  }
  if (input.cedente_nivel_2_name !== undefined) {
    updateData.cedente_nivel_2_name = input.cedente_nivel_2_name?.trim() || null
  }

  const { error: updateErr } = await supabase
    .from("collection_codes")
    .update(updateData)
    .eq("id", input.code_id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error actualizando código: ${updateErr.message}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true }
}

// ============================================================
// 3. ATTACH DOC: asociar un documento subido a un slot del código
// ============================================================
/**
 * Asocia un document_id (subido en otra acción) a uno de los 4 slots
 * de archivos del código. Los slots posibles son:
 *   - autorizacion_descuento
 *   - convenio_nivel_1
 *   - convenio_nivel_2
 *   - autorizacion_mutual_original
 */
type CodeDocSlot =
  | "autorizacion_descuento"
  | "convenio_nivel_1"
  | "convenio_nivel_2"
  | "autorizacion_mutual_original"

const SLOT_TO_COLUMN: { [K in CodeDocSlot]: string } = {
  autorizacion_descuento: "autorizacion_descuento_doc_id",
  convenio_nivel_1: "convenio_nivel_1_doc_id",
  convenio_nivel_2: "convenio_nivel_2_doc_id",
  autorizacion_mutual_original: "autorizacion_mutual_original_doc_id",
}

export async function attachDocToCodeAction(input: {
  code_id: string
  slot: CodeDocSlot
  document_id: string | null // null = desasociar
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar slot
  const column = SLOT_TO_COLUMN[input.slot]
  if (!column) {
    return { ok: false, error: `Slot inválido: ${input.slot}` }
  }

  // Validar dueño
  const { data: code, error: codeErr } = await supabase
    .from("collection_codes")
    .select(
      `
        id,
        application_id,
        application:applications!inner(
          status,
          funding_line,
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
  if (client?.owner_user_id !== user.id) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés cambiar archivos",
    }
  }

  // Si se pasa document_id, validar que el doc existe y pertenece al mismo legajo
  if (input.document_id !== null) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id, application_id")
      .eq("id", input.document_id)
      .single()
    if (!doc) {
      return { ok: false, error: "Documento no encontrado" }
    }
    if (doc.application_id !== code.application_id) {
      return { ok: false, error: "El documento no pertenece a este legajo" }
    }
  }

  // Hacer el UPDATE dinámico
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
      error: `Error asociando documento: ${updateErr.message}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true }
}

// ============================================================
// 4. EXCLUDE: marcar un código como excluido del análisis
// ============================================================
/**
 * Marca un código como "no puedo conseguir la documentación".
 * El código queda en la DB pero is_excluded = true y la línea de
 * cartera asociada queda fuera del análisis de WORCAP.
 *
 * Acepta también revertir la exclusión (is_excluded = false).
 */
export async function setCollectionCodeExclusionAction(input: {
  code_id: string
  is_excluded: boolean
  exclusion_reason?: string
}): Promise<ActionResult> {
  if (input.is_excluded && (!input.exclusion_reason || input.exclusion_reason.trim().length < 5)) {
    return {
      ok: false,
      error: "Contanos por qué no podés conseguir la documentación (mínimo 5 caracteres)",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: code, error: codeErr } = await supabase
    .from("collection_codes")
    .select(
      `
        id,
        application_id,
        application:applications!inner(
          status,
          funding_line,
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
  if (client?.owner_user_id !== user.id) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés cambiar exclusiones",
    }
  }

  const updateData = input.is_excluded
    ? {
        is_excluded: true,
        exclusion_reason: input.exclusion_reason?.trim() ?? null,
        updated_at: new Date().toISOString(),
      }
    : {
        is_excluded: false,
        exclusion_reason: null,
        updated_at: new Date().toISOString(),
      }

  const { error: updateErr } = await supabase
    .from("collection_codes")
    .update(updateData)
    .eq("id", input.code_id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error guardando exclusión: ${updateErr.message}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true }
}

// ============================================================
// 5. DELETE: eliminar un código (y todos sus archivos asociados)
// ============================================================
/**
 * Elimina un código del árbol de cobranza, incluyendo todos los
 * archivos que tenía asociados (autorización + convenios).
 */
export async function deleteCollectionCodeAction(input: {
  code_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

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
          funding_line,
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
  if (client?.owner_user_id !== user.id) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés eliminar códigos",
    }
  }

  // Recolectar los doc_ids para borrarlos también
  const docIds = [
    code.autorizacion_descuento_doc_id,
    code.convenio_nivel_1_doc_id,
    code.convenio_nivel_2_doc_id,
    code.autorizacion_mutual_original_doc_id,
  ].filter((id): id is string => !!id)

  // Si hay archivos, borrarlos del storage primero
  if (docIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, storage_path")
      .in("id", docIds)

    const paths = (docs ?? [])
      .map((d) => d.storage_path)
      .filter((p): p is string => !!p)

    if (paths.length > 0) {
      await supabase.storage.from("documents").remove(paths)
    }

    // Borrar las filas de documents
    await supabase.from("documents").delete().in("id", docIds)
  }

  // Borrar el código
  const { error: delErr } = await supabase
    .from("collection_codes")
    .delete()
    .eq("id", input.code_id)

  if (delErr) {
    return {
      ok: false,
      error: `Error eliminando código: ${delErr.message}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true }
}
