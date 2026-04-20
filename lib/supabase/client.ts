import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

/**
 * Cliente de Supabase para uso en Client Components.
 * Usa la anon key pública; toda la seguridad depende de RLS en Postgres.
 *
 * Uso:
 *   "use client"
 *   import { createClient } from "@/lib/supabase/client"
 *   const supabase = createClient()
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
