import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

/**
 * Cliente ADMIN de Supabase con service_role key.
 *
 * ⚠️⚠️⚠️ ADVERTENCIA ⚠️⚠️⚠️
 * Este cliente BYPASSA TODAS las políticas RLS.
 * Usarlo SOLO en:
 *   - Route Handlers server-side
 *   - Server Actions con validación previa estricta
 *   - Edge Functions
 *   - Scripts de seed/administración
 *
 * NUNCA importar desde un Client Component.
 * NUNCA exponer la service_role key al browser.
 *
 * Usos típicos:
 *   - Crear usuarios internos (invitar oficiales/analistas) desde panel admin
 *   - Poblar notificaciones para múltiples usuarios
 *   - Escribir en audit_log desde triggers aplicativos
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient() requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
