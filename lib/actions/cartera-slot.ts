"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type FundingLine } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

const CARTERA_PREFIX = "Cartera — "

/**
 * Agrega un slot extra de cartera al pedido de información del cliente.
 *
 * Se llama cuando el cliente quiere subir más archivos Excel además
 * de los 5 slots preset que ya creó la action de avance del oficial.
 *
 * El nombre del slot lleva el prefijo "Cartera — " para que el filtro
 * de la página de cartera lo reconozca.
 *
 * Reglas:
 *   - Solo el cliente dueño del legajo puede agregar slots
 *   - El legajo debe estar en additional_docs_pending (todavía editable)
 *   - El legajo debe ser FGPlus
 *   - Máximo 20 slots totales (3 sugeridos + 2 extra preset + 15 custom)
 */
export async function addCarteraSlotAction(input: {
  application_id: string
  custom_label: string
}): Promise<ActionResult<{ request_id: string }>> {
  const customLabel = input.custom_label?.trim()
  if (!customLabel) {
    return { ok: false, error: "Ponele un nombre al archivo" }
  }
  if (customLabel.length > 80) {
    return { ok: false, error: "El nombre es muy largo (máximo 80 caracteres)" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar que el legajo es del cliente y está en estado correcto
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
    .eq("id", input.application_id)
    .single()

  if (appErr || !app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (client?.owner_user_id !== user.id) {
    return {
      ok: false,
      error: "Este legajo no te pertenece",
    }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido de información ya fue enviado, no podés agregar más archivos",
    }
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    return {
      ok: false,
      error: "Solo FGPlus permite agregar archivos extra de cartera",
    }
  }

  // Contar cuántos slots de cartera ya existen
  const { count: existingCount } = await supabase
    .from("additional_document_requests")
    .select("id", { count: "exact", head: true })
    .eq("application_id", app.id)
    .ilike("document_name", `${CARTERA_PREFIX}%`)

  if (existingCount !== null && existingCount >= 20) {
    return {
      ok: false,
      error: "Ya tenés muchos archivos de cartera. Si necesitás más, contactanos.",
    }
  }

  // Crear el slot
  const { data: newRow, error: insertErr } = await supabase
    .from("additional_document_requests")
    .insert({
      application_id: app.id,
      funding_line: "fgplus",
      document_name: `${CARTERA_PREFIX}${customLabel}`,
      description: "Archivo extra agregado por el cliente.",
      is_required: false,
      is_preset: false,
      status: "pending",
      requested_by: user.id,
      requested_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertErr || !newRow) {
    return {
      ok: false,
      error: `Error agregando archivo: ${insertErr?.message ?? "desconocido"}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/cartera`)

  return { ok: true, data: { request_id: newRow.id } }
}

/**
 * Elimina un slot extra de cartera.
 *
 * Solo permite eliminar slots que el cliente agregó manualmente
 * (is_preset = false). Los 5 sugeridos no se pueden borrar para no romper
 * la consistencia con la action que los creó.
 *
 * Si hubo un archivo subido a ese slot, también lo borra de la tabla
 * documents (en cascada via fulfilled_by_document_id).
 */
export async function removeCarteraSlotAction(input: {
  request_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Cargar el request para validar
  const { data: req, error: reqErr } = await supabase
    .from("additional_document_requests")
    .select(
      `
        id,
        application_id,
        is_preset,
        document_name,
        fulfilled_by_document_id,
        application:applications!inner(
          status,
          funding_line,
          client:clients!inner(owner_user_id)
        )
      `
    )
    .eq("id", input.request_id)
    .single()

  if (reqErr || !req) {
    return { ok: false, error: "Slot no encontrado" }
  }

  const app = Array.isArray(req.application) ? req.application[0] : req.application
  if (!app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (client?.owner_user_id !== user.id) {
    return { ok: false, error: "Este slot no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés eliminar archivos",
    }
  }

  if (req.is_preset) {
    return {
      ok: false,
      error: "Este es un archivo sugerido y no se puede eliminar. Si no lo necesitás, dejalo sin subir.",
    }
  }

  // Si hay archivo subido, borrarlo del storage + tabla documents
  if (req.fulfilled_by_document_id) {
    // Buscar la ruta del archivo
    const { data: doc } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", req.fulfilled_by_document_id)
      .single()

    if (doc?.storage_path) {
      await supabase.storage.from("documents").remove([doc.storage_path])
    }

    await supabase
      .from("documents")
      .delete()
      .eq("id", req.fulfilled_by_document_id)
  }

  // Borrar el request
  const { error: delErr } = await supabase
    .from("additional_document_requests")
    .delete()
    .eq("id", req.id)

  if (delErr) {
    return {
      ok: false,
      error: `Error eliminando: ${delErr.message}`,
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/cartera`)

  return { ok: true }
}
