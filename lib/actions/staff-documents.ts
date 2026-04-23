"use server"

import { createClient } from "@/lib/supabase/server"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

/**
 * Devuelve una URL firmada para ver un documento desde la vista de staff.
 *
 * Permitido para: officer, analyst, admin.
 * El staff puede ver CUALQUIER documento de cualquier legajo (lo filtra la RLS
 * de la tabla documents, que permite select a is_staff()).
 *
 * Esta action existe aparte de getAdditionalDocumentSignedUrlAction porque
 * esa otra valida que el uploaded_by sea el usuario actual, lo que bloquea
 * al staff que quiere revisar docs que subió el cliente.
 */
export async function getStaffDocumentSignedUrlAction(
  document_id: string
): Promise<ActionResult<{ url: string; mime_type: string | null; file_name: string }>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  // Validar que quien llama es staff
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.is_active) {
    return { ok: false, error: "Perfil inactivo o no encontrado" }
  }
  const staffRoles = ["officer", "analyst", "admin"]
  if (!staffRoles.includes(profile.role)) {
    return { ok: false, error: "No autorizado" }
  }

  // Traer el documento (la RLS ya deja leer al staff)
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, file_path, file_name, mime_type, status")
    .eq("id", document_id)
    .single()

  if (docErr || !doc) {
    return { ok: false, error: "Documento no encontrado" }
  }

  // Generar URL firmada válida por 5 minutos
  const { data: signed, error: signErr } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 300)

  if (signErr || !signed) {
    return {
      ok: false,
      error: signErr?.message ?? "Error generando URL",
    }
  }

  return {
    ok: true,
    data: {
      url: signed.signedUrl,
      mime_type: doc.mime_type,
      file_name: doc.file_name,
    },
  }
}
