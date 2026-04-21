"use server"

import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
  loginSchema,
  registerClientSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterClientInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validators/schemas"
import { ROLE_DASHBOARDS, type UserRole } from "@/lib/constants/roles"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * Login con email + password.
 * Tras éxito: redirige al dashboard del rol correspondiente.
 */
export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return {
      ok: false,
      error: mapAuthError(error?.message) ?? "Credenciales inválidas",
    }
  }

  // Obtener rol para decidir redirect
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    return { ok: false, error: "Tu cuenta no tiene un perfil asociado. Contactá al administrador." }
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return { ok: false, error: "Tu cuenta está desactivada. Contactá al administrador." }
  }

  const dashboard = ROLE_DASHBOARDS[profile.role as UserRole]
  revalidatePath("/", "layout")
  redirect(dashboard)
}

/**
 * Registro de un cliente nuevo (auto-registro público).
 * El trigger handle_new_user crea automáticamente el profile con role=client.
 */
export async function registerClientAction(
  input: RegisterClientInput
): Promise<ActionResult> {
  const parsed = registerClientSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? null,
        role: "client",
      },
    },
  })

  if (error || !data.user) {
    return {
      ok: false,
      error: mapAuthError(error?.message) ?? "No pudimos crear tu cuenta",
    }
  }

  // Si Supabase tiene email confirmations activado, no hay sesión todavía.
  // Redirigir a una página informativa.
  return { ok: true }
}

/**
 * Cerrar sesión.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

/**
 * Enviar email de recuperación de contraseña.
 */
export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Email inválido",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  })

  // Por seguridad NO informamos si el email existía o no.
  // Siempre devolvemos ok:true (aunque hubo error, no lo revelamos).
  if (error) {
    console.error("forgotPasswordAction:", error)
  }

  return { ok: true }
}

/**
 * Setear nueva contraseña después de llegar por el link del email.
 * El usuario ya debe tener una sesión válida (Supabase la crea automáticamente al abrir el link).
 */
export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  // Verificar sesión (llegó acá vía el magic link)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      error: "El enlace venció o es inválido. Pedí uno nuevo.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { ok: false, error: mapAuthError(error.message) ?? "No pudimos actualizar tu contraseña" }
  }

  return { ok: true }
}

/**
 * ADMIN ONLY - Invitar a un usuario interno (admin/officer/analyst).
 * Usa la service_role key para crear el auth.user directamente y mandar
 * un email de invitación para que establezca su password.
 */
export async function inviteInternalUserAction(input: {
  full_name: string
  email: string
  role: "admin" | "officer" | "analyst"
  phone?: string
}): Promise<ActionResult> {
  // Validar que quien llama es admin
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (callerProfile?.role !== "admin") {
    return { ok: false, error: "Solo los administradores pueden invitar usuarios internos" }
  }

  // Crear usuario con service_role
  const admin = createAdminClient()
  const origin = await getOrigin()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${origin}/reset-password`,
    data: {
      full_name: input.full_name,
      phone: input.phone ?? null,
      role: input.role,
    },
  })

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "No pudimos crear la invitación" }
  }

  revalidatePath("/admin/usuarios")
  return { ok: true }
}

// ============================================================
// Helpers
// ============================================================

function mapAuthError(message?: string): string | null {
  if (!message) return null
  const m = message.toLowerCase()
  if (m.includes("invalid login")) return "Email o contraseña incorrectos"
  if (m.includes("email not confirmed")) return "Tenés que verificar tu email primero. Revisá tu bandeja."
  if (m.includes("user already registered")) return "Este email ya está registrado. Iniciá sesión."
  if (m.includes("password should be")) return "La contraseña no cumple los requisitos de seguridad"
  if (m.includes("rate limit")) return "Demasiados intentos. Esperá unos minutos."
  return null
}

// Helper: deriva la URL base desde los headers del request.
// Prioridad: NEXT_PUBLIC_SITE_URL > x-forwarded-host/proto > host header > localhost fallback.
// Esto hace que los redirects de auth funcionen sin depender de env vars bien configuradas.
async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }
  try {
    const h = await headers()
    const host = h.get("x-forwarded-host") ?? h.get("host")
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
    if (host) return `${proto}://${host}`
  } catch {
    // no-op: fuera de contexto de request
  }
  return "http://localhost:3000"
}

