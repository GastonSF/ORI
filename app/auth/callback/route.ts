import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { ROLE_DASHBOARDS, type UserRole } from "@/lib/constants/roles"

/**
 * Callback que Supabase redirige después de:
 *   - Verificación de email al registrarse
 *   - Magic link
 *
 * Intercambia el `code` por una sesión y redirige al dashboard del rol.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? null

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Traer el rol para decidir dónde mandar al usuario
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        const target = next ?? (profile ? ROLE_DASHBOARDS[profile.role as UserRole] : "/")
        return NextResponse.redirect(`${origin}${target}`)
      }
    }
  }

  // Algo falló: volver al login con error
  return NextResponse.redirect(`${origin}/login?error=invalid_link`)
}
