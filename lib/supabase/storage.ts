import type { DocumentType } from "@/lib/constants/roles"
import { createClient } from "@/lib/supabase/server"

/**
 * Construye el path canónico de un archivo en el bucket 'documents'.
 * Estructura: clients/{client_id}/{application_id}/{document_type}/{timestamp}_{filename}
 *
 * La estructura está alineada con las storage policies:
 * el cliente solo puede operar sobre paths que empiecen con `clients/{su_client_id}/`.
 */
export function buildDocumentPath(params: {
  clientId: string
  applicationId: string
  documentType: DocumentType
  originalFileName: string
}): string {
  const { clientId, applicationId, documentType, originalFileName } = params
  const timestamp = Date.now()
  const sanitized = sanitizeFileName(originalFileName)
  return `clients/${clientId}/${applicationId}/${documentType}/${timestamp}_${sanitized}`
}

/**
 * Limpia un filename para que sea válido y seguro en storage.
 */
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .replace(/[^a-zA-Z0-9._-]/g, "_") // todo lo raro a _
    .replace(/_+/g, "_")
    .slice(0, 180) // evitar paths gigantes
}

/**
 * Genera una URL firmada para descargar un documento.
 * Por defecto expira en 60 segundos. Usar desde Server Components/Actions.
 */
export async function getSignedDocumentUrl(
  filePath: string,
  expiresInSeconds: number = 60
): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, expiresInSeconds)

  if (error || !data) {
    console.error("Error creando signed URL:", error)
    return null
  }

  return data.signedUrl
}

/**
 * Límite de tamaño de archivo: 25 MB (coincide con file_size_limit del bucket).
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
