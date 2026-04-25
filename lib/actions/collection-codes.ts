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
// HELPERS
// ============================================================

/**
 * Valida que el legajo es del cliente y está en estado modificable.
 * Devuelve el legajo si todo OK, sino devuelve error.
 */
type AppValidationResult =
  | { ok: true; app: { id: string } }
  | { ok: false; error: string }

async function validateAppOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  applicationId: string
): Promise<AppValidationResult> {
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
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (client?.owner_user_id !== userId) {
    return { ok: false, error: "Este legajo no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés modificar los códigos",
    }
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    return {
      ok: false,
      error: "Los códigos de cobranza solo aplican a FGPlus",
    }
  }

  return { ok: true, app: { id: app.id } }
}

/**
 * Valida que el código pertenezca a un legajo del cliente y modificable.
 */
async function validateCodeOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  codeId: string
): Promise
  | { ok: true; code: { id: string; application_id: string } }
  | { ok: false; error: string }
> {
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
    .eq("id", codeId)
    .single()

  if (codeErr || !code) {
    return { ok: false, error: "Código no encontrado" }
  }

  const app = Array.isArray(code.application) ? code.application[0] : code.application
  if (!app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (client?.owner_user_id !== userId) {
    return { ok: false, error: "Este código no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés modificar los códigos",
    }
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    return {
      ok: false,
      error: "Los códigos de cobranza solo aplican a FGPlus",
    }
  }

  return { ok: true, code: { id: code.id, application_id: code.application_id } }
}

function revalidate(applicationId: string) {
  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)
}

// ============================================================
// 1. CREAR un código nuevo (vacío)
// ============================================================

/**
 * Crea un nuevo código de descuento de haberes vacío.
 *
 * El cliente clickea "Agregar otro código" y aparece una card nueva.
 * El código arranca sin nombre, sin ownership y sin docs.
 *
 * Devuelve el ID del código creado.
 */
export async function addCollectionCodeAction(input: {
  application_id: string
}): Promise<ActionResult<{ code_id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const v = await validateAppOwnership(supabase, user.id, input.application_id)
  if (!v.ok) return v

  // Por defecto el código arranca vacío. Le ponemos un nombre placeholder
  // que el cliente va a sobreescribir, y ownership 'propio' como default
  // (el más simple, solo pide 1 autorización).
  const { data: newCode, error: insertErr } = await supabase
    .from("collection_codes")
    .insert({
      application_id: v.app.id,
      code_name: "",
      ownership: "propio",
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

  revalidate(v.app.id)
  return { ok: true, data: { code_id: newCode.id } }
}

// ============================================================
// 2. ACTUALIZAR un código (nombre, ownership, cedentes)
// ============================================================

/**
 * Actualiza los campos de texto de un código.
 *
 * Cuando el cliente cambia el ownership, los doc_ids que ya no aplican
 * se setean a null (porque podrían haber sido subidos antes y ahora
 * sobran). Por ejemplo: si el cliente carga "tercero_sub_cedido" con
 * 2 niveles y después cambia a "propio", limpiamos los convenios.
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

  const v = await validateCodeOwnership(supabase, user.id, input.code_id)
  if (!v.ok) return v

  // Validación de ownership si viene en input
  if (input.ownership && !COLLECTION_CODE_OWNERSHIPS.includes(input.ownership)) {
    return { ok: false, error: `Ownership inválido: ${input.ownership}` }
  }

  // Validar longitud del nombre si viene
  if (input.code_name !== undefined && input.code_name.length > 80) {
    return { ok: false, error: "El nombre del código es muy largo (máximo 80)" }
  }

  // Construir el update solo con los campos que vienen
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.code_name !== undefined) {
    updates.code_name = input.code_name.trim()
  }

  if (input.ownership !== undefined) {
    updates.ownership = input.ownership

    // Limpiar campos que no aplican al nuevo ownership
    if (input.ownership === "propio") {
      // No hay cedentes ni convenios
      updates.cedente_nivel_1_name = null
      updates.cedente_nivel_2_name = null
      updates.convenio_nivel_1_doc_id = null
      updates.convenio_nivel_2_doc_id = null
      updates.autorizacion_mutual_original_doc_id = null
    } else if (input.ownership === "tercero_directo") {
      // Solo cedente nivel 1 y convenio nivel 1
      updates.cedente_nivel_2_name = null
      updates.convenio_nivel_2_doc_id = null
      updates.autorizacion_mutual_original_doc_id = null
    }
    // tercero_sub_cedido: todo aplica, no limpiamos nada
  }

  if (input.cedente_nivel_1_name !== undefined) {
    updates.cedente_nivel_1_name = input.cedente_nivel_1_name?.trim() || null
  }

  if (input.cedente_nivel_2_name !== undefined) {
    updates.cedente_nivel_2_name = input.cedente_nivel_2_name?.trim() || null
  }

  const { error: updateErr } = await supabase
    .from("collection_codes")
    .update(updates)
    .eq("id", input.code_id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error actualizando código: ${updateErr.message}`,
    }
  }

  revalidate(v.code.application_id)
  return { ok: true }
}

// ============================================================
// 3. ASOCIAR un documento a un slot del código
// ============================================================

type DocSlot =
  | "autorizacion_descuento"
  | "convenio_nivel_1"
  | "convenio_nivel_2"
  | "autorizacion_mutual_original"

const DOC_SLOT_COLUMN: { [K in DocSlot]: string } = {
  autorizacion_descuento: "autorizacion_descuento_doc_id",
  convenio_nivel_1: "convenio_nivel_1_doc_id",
  convenio_nivel_2: "convenio_nivel_2_doc_id",
  autorizacion_mutual_original: "autorizacion_mutual_original_doc_id",
}

/**
 * Asocia un document_id (ya subido en la tabla documents) a un slot
 * específico del código de descuento.
 *
 * El upload del archivo se hace por separado (con el mismo flujo que
 * usamos para additional_documents). Esta action solo conecta los IDs.
 *
 * Si pasás document_id = null, desasocia el slot.
 */
export async function attachDocToCodeAction(input: {
  code_id: string
  slot: DocSlot
  document_id: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const v = await validateCodeOwnership(supabase, user.id, input.code_id)
  if (!v.ok) return v

  const column = DOC_SLOT_COLUMN[input.slot]
  if (!column) {
    return { ok: false, error: `Slot inválido: ${input.slot}` }
  }

  // Si viene un document_id, validar que ese doc existe y pertenece al legajo
  if (input.document_id) {
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, application_id")
      .eq("id", input.document_id)
      .single()

    if (docErr || !doc) {
      return { ok: false, error: "Documento no encontrado" }
    }

    if (doc.application_id !== v.code.application_id) {
      return {
        ok: false,
        error: "El documento no pertenece a este legajo",
      }
    }
  }

  const { error: updateErr } = await supabase
    .from("collection_codes")
    .update({
      [column]: input.document_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.code_id)

  if (updateErr) {
    return {
      ok: false,
      error: `Error asociando documento: ${updateErr.message}`,
    }
  }

  revalidate(v.code.application_id)
  return { ok: true }
}

// ============================================================
// 4. EXCLUIR un código (escape "no tengo este documento")
// ============================================================

/**
 * Marca un código como excluido del análisis.
 *
 * El cliente lo usa cuando no puede conseguir alguno de los documentos
 * requeridos. WORCAP toma esta línea fuera del análisis (la cartera
 * asociada a este código no se va a tener en cuenta).
 *
 * Pasar exclude=false revierte la exclusión.
 */
export async function excludeCollectionCodeAction(input: {
  code_id: string
  exclude: boolean
  reason?: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const v = await validateCodeOwnership(supabase, user.id, input.code_id)
  if (!v.ok) return v

  if (input.exclude) {
    const reason = input.reason?.trim()
    if (!reason) {
      return { ok: false, error: "Decinos por qué no podés conseguir el documento" }
    }
    if (reason.length > 500) {
      return { ok: false, error: "El motivo es muy largo (máximo 500)" }
    }

    const { error: updateErr } = await supabase
      .from("collection_codes")
      .update({
        is_excluded: true,
        exclusion_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.code_id)

    if (updateErr) {
      return {
        ok: false,
        error: `Error excluyendo código: ${updateErr.message}`,
      }
    }
  } else {
    // Revertir exclusión
    const { error: updateErr } = await supabase
      .from("collection_codes")
      .update({
        is_excluded: false,
        exclusion_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.code_id)

    if (updateErr) {
      return {
        ok: false,
        error: `Error revirtiendo exclusión: ${updateErr.message}`,
      }
    }
  }

  revalidate(v.code.application_id)
  return { ok: true }
}

// ============================================================
// 5. ELIMINAR un código completo
// ============================================================

/**
 * Elimina un código del legajo.
 *
 * También borra los documents asociados (autorizaciones, convenios) tanto
 * de la tabla documents como del Storage. Si el código tenía slots vacíos,
 * no pasa nada.
 */
export async function deleteCollectionCodeAction(input: {
  code_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const v = await validateCodeOwnership(supabase, user.id, input.code_id)
  if (!v.ok) return v

  // Cargar el código para obtener los doc_ids
  const { data: code } = await supabase
    .from("collection_codes")
    .select(
      "autorizacion_descuento_doc_id, convenio_nivel_1_doc_id, convenio_nivel_2_doc_id, autorizacion_mutual_original_doc_id"
    )
    .eq("id", input.code_id)
    .single()

  if (code) {
    const docIds = [
      code.autorizacion_descuento_doc_id,
      code.convenio_nivel_1_doc_id,
      code.convenio_nivel_2_doc_id,
      code.autorizacion_mutual_original_doc_id,
    ].filter((id): id is string => !!id)

    if (docIds.length > 0) {
      // Buscar las rutas de storage para borrar los archivos
      const { data: docs } = await supabase
        .from("documents")
        .select("id, storage_path")
        .in("id", docIds)

      if (docs && docs.length > 0) {
        const paths = docs
          .map((d) => d.storage_path)
          .filter((p): p is string => !!p)

        if (paths.length > 0) {
          await supabase.storage.from("documents").remove(paths)
        }

        await supabase.from("documents").delete().in("id", docIds)
      }
    }
  }

  // Borrar el código (esto también limpia las FKs porque están en SET NULL)
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

  revalidate(v.code.application_id)
  return { ok: true }
}
