"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  FUNDING_LINES,
  FGPLUS_PRESET_DOCS,
  type FundingLine,
} from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

const chooseFundingLineSchema = z.object({
  application_id: z.string().uuid(),
  funding_line: z.enum(FUNDING_LINES),
})

type ChooseFundingLineInput = z.infer<typeof chooseFundingLineSchema>

export async function chooseFundingLineAction(
  input: ChooseFundingLineInput
): Promise<ActionResult> {
  const parsed = chooseFundingLineSchema.safeParse(input)
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

  const { data: app } = await supabase
    .from("applications")
    .select("id, status, enabled_funding_lines, clients!inner(owner_user_id)")
    .eq("id", parsed.data.application_id)
    .single()

  if (!app) return { ok: false, error: "Legajo no encontrado" }

  const ownerId = Array.isArray(app.clients)
    ? app.clients[0]?.owner_user_id
    : (app.clients as { owner_user_id: string })?.owner_user_id
  if (ownerId !== user.id) return { ok: false, error: "No autorizado" }

  if (app.status !== "awaiting_funding_line_choice") {
    return {
      ok: false,
      error: "El legajo no está en estado de elegir línea de fondeo",
    }
  }

  const enabledLines = (app.enabled_funding_lines ?? []) as FundingLine[]
  if (!enabledLines.includes(parsed.data.funding_line)) {
    return {
      ok: false,
      error: "Esta línea no está habilitada para tu legajo",
    }
  }

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      funding_line: parsed.data.funding_line,
      funding_line_chosen_at: new Date().toISOString(),
      status: "additional_docs_pending",
      current_owner_role: "client",
    })
    .eq("id", parsed.data.application_id)

  if (updateError) return { ok: false, error: updateError.message }

  if (parsed.data.funding_line === "fgplus") {
    const presetRows = FGPLUS_PRESET_DOCS.map((preset) => ({
      application_id: parsed.data.application_id,
      funding_line: "fgplus" as const,
      document_name: preset.document_name,
      description: preset.description,
      is_required: preset.is_required,
      is_preset: true,
      requested_by: user.id,
      status: "pending" as const,
    }))

    const { error: insertError } = await supabase
      .from("additional_document_requests")
      .insert(presetRows)

    if (insertError) {
      console.error("Error creando presets FGPlus:", insertError.message)
    }
  }

  revalidatePath("/cliente")
  revalidatePath("/cliente/solicitud")
  revalidatePath("/cliente/documentos")
  revalidatePath("/cliente/eleccion-linea")

  return { ok: true }
}
