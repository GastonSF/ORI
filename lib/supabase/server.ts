import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"

/**
 * Cliente de Supabase para uso en Server Components, Route Handlers y Server Actions.
 * Lee/escribe cookies para mantener la sesión sincronizada entre server y client.
 *
 * Uso en un Server Component:
 *   import { createClient } from "@/lib/supabase/server"
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Es normal que falle si se llama desde un Server Component "puro"
            // que no puede setear cookies. El middleware ya refresca la sesión.
          }
        },
      },
    }
  )
}
