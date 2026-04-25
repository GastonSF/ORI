"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  COLLECTION_CHANNELS,
  DEBITO_TIPOS,
  type CollectionChannel,
  type DebitoTipo,
  type FundingLine,
} from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

/**
 * Guarda los canales de cobranza y los tipos de débito que el cliente eligió.
 *
 * Esta es la primera parte del árbol: define qué canales usa el cliente
 * (descuento de haberes / débito en cuenta / pago voluntario), y si marca
 * débito, qué tipo de cuenta (cuenta corriente / caja de ahorro).
 *
 * Reglas:
 *   - Solo el dueño del legajo puede modificar
 *   - El legajo debe estar en additional_docs_pending
 *   - El legajo debe ser FGPlus
 *   - Si NO se marcó débito_cuenta, debito_tipos se vacía automáticamente
 *
 * NOTA: si el cliente desmarca "descuento de haberes", los códigos cargados
 * NO se borran automáticamente — quedan en la DB y dejan de aparecer en la UI.
 * Esto es a propósito: si el cliente cambia de opinión y vuelve a marcar el
 * canal, recupera lo que ya cargó. Si el cliente realmente quiere descartarlos,
 * los borra de a uno con la papelerita.
 */
export async function saveCobranzaChannelsAction(input: {
  application_id: string
  channels: CollectionChannel[]
  debito_tipos: DebitoTipo[]
}): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar canales
  for (const c of input.channels) {
    if (!COLLECTION_CHANNELS.includes(c)) {
      return { ok: false, error: `Canal inválido: ${c}` }
    }
  }

  // Si NO incluye débito_cuenta, los tipos se ignoran
  const includesDebito = input.channels.includes("debito_cuenta")
  let normalizedDebitoTipos: DebitoTipo[] = []

  if (includesDebito) {
    for (const t of input.debito_tipos) {
      if (!DEBITO_TIPOS.includes(t)) {
        return { ok: false, error: `Tipo de débito inválido: ${t}` }
      }
    }
    // Deduplicar
    normalizedDebitoTipos = [...new Set(input.debito_tipos)]
  }

  // Deduplicar canales
  const normalizedChannels = [...new Set(input.channels)]

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
    return { ok: false, error: "Este legajo no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "El pedido ya fue enviado, no podés modificar los canales",
    }
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    return {
      ok: false,
      error: "El árbol de cobranza solo aplica a FGPlus",
    }
  }

  // Verificar que existe la fila en funding_line_responses
  const { data: existing } = await supabase
    .from("funding_line_responses")
    .select("id")
    .eq("application_id", app.id)
    .maybeSingle()

  if (!existing) {
    // Crear si no existe (defensa: la action de avance debería haberla creado,
    // pero por las dudas)
    const { error: insertErr } = await supabase
      .from("funding_line_responses")
      .insert({
        application_id: app.id,
        channels: normalizedChannels,
        debito_tipos: normalizedDebitoTipos,
        completed_at: null,
      })

    if (insertErr) {
      return {
        ok: false,
        error: `Error guardando canales: ${insertErr.message}`,
      }
    }
  } else {
    const { error: updateErr } = await supabase
      .from("funding_line_responses")
      .update({
        channels: normalizedChannels,
        debito_tipos: normalizedDebitoTipos,
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", app.id)

    if (updateErr) {
      return {
        ok: false,
        error: `Error guardando canales: ${updateErr.message}`,
      }
    }
  }

  revalidatePath(`/cliente/pedido-informacion`)
  revalidatePath(`/cliente/pedido-informacion/politica-cobranza`)

  return { ok: true }
}
