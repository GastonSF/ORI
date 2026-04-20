import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database.types"
import type { UserRole } from "@/lib/constants/roles"

/**
 * Actualiza la sesión de Supabase en cada request del middleware y verifica
 * permisos de acceso por rol.
 *
 * Reglas:
 *   - Rutas públicas (/, /login, /register, /forgot-password): sin auth requerida
 *   - Rutas /cliente/*: requiere role=client
 *   - Rutas /oficial/*: requiere role=officer
 *   - Rutas /analista/*: requiere role=analyst
 *   - Rutas /admin/*: requiere role=admin
 */

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/auth/callback"]

const ROUTE_ROLES: Record<string, UserRole> = {
  "/cliente": "client",
  "/oficial": "officer",
  "/analista": "analyst",
  "/admin": "admin",
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() refresca el token si está vencido
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Permitir assets estáticos sin verificación
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    pathname.includes(".")
  ) {
    return supabaseResponse
  }

  // Si es ruta pública, dejar pasar
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )
  if (isPublic) {
    // Si está logueado y va a /login o /register, redirigir a su dashboard
    if (user && (pathname === "/login" || pathname === "/register")) {
      const role = await getUserRole(supabase, user.id)
      if (role) {
        return NextResponse.redirect(new URL(dashboardFor(role), request.url))
      }
    }
    return supabaseResponse
  }

  // Rutas protegidas: requiere sesión
  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verificar rol contra la ruta
  const requiredRole = getRequiredRole(pathname)
  if (requiredRole) {
    const role = await getUserRole(supabase, user.id)
    if (role !== requiredRole) {
      // Rol incorrecto: redirigir a su propio dashboard
      const target = role ? dashboardFor(role) : "/login"
      return NextResponse.redirect(new URL(target, request.url))
    }
  }

  return supabaseResponse
}

function getRequiredRole(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(ROUTE_ROLES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return role
    }
  }
  return null
}

async function getUserRole(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .single()

  if (!data || !data.is_active) return null
  return data.role as UserRole
}

function dashboardFor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin"
    case "officer":
      return "/oficial"
    case "analyst":
      return "/analista"
    case "client":
      return "/cliente"
  }
}
