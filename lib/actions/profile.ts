"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

// ============================================================
// ACTUALIZAR DATOS DEL PERFIL (nombre + teléfono)
// ============================================================

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, "El nombre tiene que tener al menos 2 caracteres").max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v ?? null)),
})

type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath("/staff/ajustes")
  revalidatePath("/staff", "layout")
  return { ok: true }
}

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Ingresá tu contraseña actual"),
    new_password: z
      .string()
      .min(8, "La nueva contraseña tiene que tener al menos 8 caracteres")
      .max(72),
    confirm_password: z.string().min(1, "Confirmá la nueva contraseña"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  })
  .refine((d) => d.current_password !== d.new_password, {
    message: "La nueva contraseña tiene que ser distinta a la actual",
    path: ["new_password"],
  })

type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: "No autenticado" }

  // Verificar contraseña actual re-autenticando
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  })

  if (signInError) {
    return {
      ok: false,
      error: "La contraseña actual no es correcta",
      fieldErrors: { current_password: ["La contraseña actual no es correcta"] },
    }
  }

  // Actualizar a la nueva contraseña
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  })

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  return { ok: true }
}
