"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type CollectionChannel,
  type DebitoTipo,
  type CollectionCodeOwnership,
  type FundingLine,
} from "@/lib/constants/roles"

export type SubmitResult =
  | { ok: true }
  | {
      ok: false
      error: string
      // Lista de items específicos que faltan, para mostrar en la UI
      missing?: string[]
    }

/**
 * Action de envío del pedido de información (FGPlus).
 *
 * Esta action es la ÚNICA forma de que un legajo FGPlus pase de
 * 'additional_docs_pending' a 'additional_docs_review'.
 *
 * Replica las validaciones que el cliente ve en la UI:
 *   1. Cartera: 3 sugeridos (is_required) subidos
 *   2. Política de originación: archivo subido
 *   3. Cobranza:
 *      - Al menos 1 canal seleccionado
 *      - Si débito → al menos 1 tipo
 *      - Si descuento → al menos 1 código + todos completos o excluidos
 *
 * Si todo OK:
 *   - Setea applications.info_request_completed_at = NOW()
 *   - Setea applications.status = 'additional_docs_review'
 *   - Setea applications.current_owner_role = 'officer'
 *   - Setea funding_line_responses.completed_at = NOW()
 *
 * Si algo falla, devuelve missing[] con los items específicos.
 */
export async function submitInfoRequestAction(input: {
  application_id: string
}): Promise<SubmitResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // ============================================================
  // Validar dueño + estado + línea
  // ============================================================
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select(
      `
        id,
        status,
        funding_line,
        client:clients!inner(id, owner_user_id)
      `
    )
    .eq("id", input.application_id)
    .single()

  if (appErr || !app) {
    return { ok: false, error: "Legajo no encontrado" }
  }

  const client = Array.isArray(app.client) ? app.client[0] : app.client
  if (!client || client.owner_user_id !== user.id) {
    return { ok: false, error: "Este legajo no te pertenece" }
  }

  if (app.status !== "additional_docs_pending") {
    return {
      ok: false,
      error: "Este legajo ya fue enviado o no está en una etapa válida",
    }
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    return {
      ok: false,
      error: "Este flujo solo aplica a la línea FGPlus",
    }
  }

  // ============================================================
  // Validación 1: Composición de cartera
  // ============================================================
  const missing: string[] = []

  const { data: carteraRequests } = await supabase
    .from("additional_document_requests")
    .select("id, document_name, is_required, status")
    .eq("application_id", app.id)
    .ilike("document_name", "Cartera —%")

  const carteraSugeridos = (carteraRequests ?? []).filter(
    (r) => r.is_required
  )
  const carteraSubidos = carteraSugeridos.filter(
    (r) => r.status === "fulfilled" || r.status === "approved"
  )

  if (carteraSugeridos.length === 0) {
    missing.push("Cartera: no hay archivos sugeridos configurados")
  } else if (carteraSubidos.length < carteraSugeridos.length) {
    const faltantes = carteraSugeridos.length - carteraSubidos.length
    missing.push(
      `Cartera: te falta${faltantes !== 1 ? "n" : ""} subir ${faltantes} archivo${
        faltantes !== 1 ? "s" : ""
      } sugerido${faltantes !== 1 ? "s" : ""}`
    )
  }

  // ============================================================
  // Validación 2: Política de originación
  // ============================================================
  const { data: politicaReq } = await supabase
    .from("additional_document_requests")
    .select("id, status")
    .eq("application_id", app.id)
    .eq("document_name", "Política de originación")
    .maybeSingle()

  if (!politicaReq) {
    missing.push("Política de originación: no se encontró el pedido")
  } else if (politicaReq.status !== "fulfilled" && politicaReq.status !== "approved") {
    missing.push("Política de originación: subí el documento")
  }

  // ============================================================
  // Validación 3: Política de cobranza (árbol)
  // ============================================================
  const { data: tree } = await supabase
    .from("funding_line_responses")
    .select("id, channels, debito_tipos")
    .eq("application_id", app.id)
    .maybeSingle()

  if (!tree) {
    missing.push("Política de cobranza: no se encontró la respuesta")
  } else {
    const channels = (tree.channels ?? []) as CollectionChannel[]
    const debitoTipos = (tree.debito_tipos ?? []) as DebitoTipo[]
    const includesDescuento = channels.includes("descuento_haberes")
    const includesDebito = channels.includes("debito_cuenta")

    if (channels.length === 0) {
      missing.push("Política de cobranza: marcá al menos un canal")
    } else {
      if (includesDebito && debitoTipos.length === 0) {
        missing.push(
          "Política de cobranza: marcaste 'Débito en cuenta' pero falta el tipo de cuenta"
        )
      }

      if (includesDescuento) {
        const { data: codes } = await supabase
          .from("collection_codes")
          .select(
            `
              id,
              code_name,
              ownership,
              cedente_nivel_1_name,
              cedente_nivel_2_name,
              is_excluded,
              autorizacion_descuento_doc_id,
              convenio_nivel_1_doc_id,
              convenio_nivel_2_doc_id,
              autorizacion_mutual_original_doc_id
            `
          )
          .eq("application_id", app.id)

        const codesList = codes ?? []

        if (codesList.length === 0) {
          missing.push(
            "Política de cobranza: marcaste 'Descuento de haberes' pero no agregaste ningún código"
          )
        } else {
          const incompletos: string[] = []
          for (let i = 0; i < codesList.length; i++) {
            const c = codesList[i]
            if (!isCodeComplete(c)) {
              const label = c.code_name?.trim()
                ? `"${c.code_name.trim()}"`
                : `Código ${i + 1}`
              incompletos.push(label)
            }
          }
          if (incompletos.length > 0) {
            missing.push(
              `Política de cobranza: completá o marcá como "no tengo" los siguientes códigos: ${incompletos.join(", ")}`
            )
          }
        }
      }
    }
  }

  // ============================================================
  // Si hay items faltantes, abortar
  // ============================================================
  if (missing.length > 0) {
    return {
      ok: false,
      error: "El pedido tiene secciones incompletas",
      missing,
    }
  }

  // ============================================================
  // Todo OK: aplicar los cambios
  // ============================================================
  const now = new Date().toISOString()

  // 1. Actualizar applications
  const { error: appUpdateErr } = await supabase
    .from("applications")
    .update({
      status: "additional_docs_review",
      current_owner_role: "officer",
      info_request_completed_at: now,
      updated_at: now,
    })
    .eq("id", app.id)

  if (appUpdateErr) {
    return {
      ok: false,
      error: `Error actualizando legajo: ${appUpdateErr.message}`,
    }
  }

  // 2. Actualizar funding_line_responses
  if (tree) {
    await supabase
      .from("funding_line_responses")
      .update({
        completed_at: now,
        updated_at: now,
      })
      .eq("application_id", app.id)
  }

  // 3. Audit log (best-effort, no fallar si no se puede insertar)
  try {
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "submit_info_request",
      entity_type: "application",
      entity_id: app.id,
      old_value: { status: "additional_docs_pending" },
      new_value: { status: "additional_docs_review" },
    })
  } catch {
    // No-op
  }

  // 4. Revalidar paths
  revalidatePath("/cliente")
  revalidatePath("/cliente/pedido-informacion")
  revalidatePath("/cliente/pedido-informacion/cartera")
  revalidatePath("/cliente/pedido-informacion/politica-originacion")
  revalidatePath("/cliente/pedido-informacion/politica-cobranza")
  revalidatePath("/staff")

  return { ok: true }
}

// ============================================================
// HELPER: ¿un código está completo?
// (Replica la lógica que ya tenemos en el card y en el index)
// ============================================================
type RawCode = {
  code_name: string
  ownership: string
  cedente_nivel_1_name: string | null
  cedente_nivel_2_name: string | null
  is_excluded: boolean
  autorizacion_descuento_doc_id: string | null
  convenio_nivel_1_doc_id: string | null
  convenio_nivel_2_doc_id: string | null
  autorizacion_mutual_original_doc_id: string | null
}

function isCodeComplete(c: RawCode): boolean {
  if (c.is_excluded) return true
  if (!c.code_name?.trim()) return false

  const ownership = c.ownership as CollectionCodeOwnership
  switch (ownership) {
    case "propio":
      return !!c.autorizacion_descuento_doc_id
    case "tercero_directo":
      return (
        !!c.cedente_nivel_1_name?.trim() &&
        !!c.convenio_nivel_1_doc_id &&
        !!c.autorizacion_descuento_doc_id
      )
    case "tercero_sub_cedido":
      return (
        !!c.cedente_nivel_1_name?.trim() &&
        !!c.cedente_nivel_2_name?.trim() &&
        !!c.convenio_nivel_1_doc_id &&
        !!c.autorizacion_descuento_doc_id &&
        !!c.convenio_nivel_2_doc_id &&
        !!c.autorizacion_mutual_original_doc_id
      )
    default:
      return false
  }
}
