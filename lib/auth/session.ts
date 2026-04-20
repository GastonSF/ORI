import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/types/database.types"
import type { UserRole } from "@/lib/constants/roles"
import { ROLE_DASHBOARDS } from "@/lib/constants/roles"

/**
 * Obtiene el user autenticado y su profile.
 * Si no hay sesión, redirige a /login.
 * Si el profile está inactivo, cierra sesión y redirige a /login.
 */
export async function requireUser(): Promise<{
  user: { id: string; email: string | null }
  profile: Profile
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    // Raro: usuario existe pero sin profile. Podría indicar trigger fallido.
    await supabase.auth.signOut()
    redirect("/login?error=missing_profile")
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect("/login?error=account_inactive")
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile,
  }
}

/**
 * Como requireUser, pero además exige un rol específico.
 * Si el rol no coincide, redirige al dashboard correspondiente al rol real.
 */
export async function requireRole(role: UserRole) {
  const { user, profile } = await requireUser()

  if (profile.role !== role) {
    redirect(ROLE_DASHBOARDS[profile.role as UserRole])
  }

  return { user, profile }
}

/**
 * Como requireUser, pero permite una lista de roles aceptables.
 */
export async function requireAnyRole(roles: UserRole[]) {
  const { user, profile } = await requireUser()

  if (!roles.includes(profile.role as UserRole)) {
    redirect(ROLE_DASHBOARDS[profile.role as UserRole])
  }

  return { user, profile }
}

/**
 * Obtiene user + profile sin redirigir (útil para layouts que quieren
 * comportarse distinto si no hay sesión).
 */
export async function getOptionalUser(): Promise<{
  user: { id: string; email: string | null } | null
  profile: Profile | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile ?? null,
  }
}
