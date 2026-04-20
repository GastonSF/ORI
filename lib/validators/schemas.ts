import { z } from "zod"
import {
  CLIENT_TYPES,
  APPLICATION_STATUSES,
  DOCUMENT_TYPES,
  DICTAMEN_DECISIONS,
} from "@/lib/constants/roles"

// ============================================================
// Helpers
// ============================================================

// CUIT argentino: XX-XXXXXXXX-X
const cuitRegex = /^\d{2}-\d{8}-\d{1}$/

/**
 * Valida el dígito verificador del CUIT (algoritmo oficial AFIP).
 */
function isValidCuit(cuit: string): boolean {
  const clean = cuit.replace(/-/g, "")
  if (clean.length !== 11) return false

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const digits = clean.split("").map(Number)
  const checkDigit = digits[10]

  const sum = multipliers.reduce((acc, m, i) => acc + m * digits[i], 0)
  const rest = sum % 11
  const expected = rest === 0 ? 0 : rest === 1 ? 9 : 11 - rest

  return expected === checkDigit
}

export const cuitSchema = z
  .string()
  .regex(cuitRegex, "Formato inválido. Usá XX-XXXXXXXX-X")
  .refine(isValidCuit, "CUIT inválido (dígito verificador incorrecto)")

export const emailSchema = z.string().email("Email inválido").toLowerCase().trim()

export const strongPasswordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")

// ============================================================
// AUTH
// ============================================================
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña"),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerClientSchema = z
  .object({
    full_name: z.string().min(2, "Ingresá tu nombre completo").max(120),
    email: emailSchema,
    phone: z.string().min(6, "Teléfono inválido").optional().or(z.literal("")),
    password: strongPasswordSchema,
    confirm_password: z.string(),
    accept_terms: z.literal(true, {
      errorMap: () => ({ message: "Debés aceptar los términos" }),
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  })
export type RegisterClientInput = z.infer<typeof registerClientSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// ============================================================
// ADMIN - Invitar usuario interno
// ============================================================
export const inviteUserSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: emailSchema,
  role: z.enum(["admin", "officer", "analyst"]),
  phone: z.string().optional().or(z.literal("")),
})
export type InviteUserInput = z.infer<typeof inviteUserSchema>

// ============================================================
// CLIENT - Onboarding (datos de la empresa)
// ============================================================
export const clientTypeSchema = z.enum(CLIENT_TYPES)

export const clientGeneralDataSchema = z.object({
  legal_name: z.string().min(2, "Ingresá razón social").max(200),
  cuit: cuitSchema,
  contact_email: emailSchema,
  contact_phone: z.string().optional().or(z.literal("")),
  fiscal_address: z.string().max(250).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  province: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  main_activity: z.string().max(200).optional().or(z.literal("")),
  activity_start_date: z.string().date().optional().or(z.literal("")),
  annual_revenue: z.number().nonnegative().optional().nullable(),
})
export type ClientGeneralDataInput = z.infer<typeof clientGeneralDataSchema>

export const companyMemberSchema = z.object({
  full_name: z.string().min(2).max(120),
  dni: z.string().regex(/^\d{7,9}$/, "DNI inválido (solo números)"),
  role: z.string().min(2).max(60),
  participation_pct: z.number().min(0).max(100).optional().nullable(),
})
export type CompanyMemberInput = z.infer<typeof companyMemberSchema>

// ============================================================
// APPLICATION (legajo)
// ============================================================
export const applicationCreateSchema = z.object({
  client_id: z.string().uuid(),
  requested_amount: z.number().positive("El monto debe ser mayor a cero"),
  requested_term_months: z.number().int().min(1).max(360),
  purpose: z.string().min(5, "Describí el destino del crédito").max(500),
})
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>

export const applicationStatusUpdateSchema = z.object({
  application_id: z.string().uuid(),
  new_status: z.enum(APPLICATION_STATUSES),
  note: z.string().max(1000).optional(),
})
export type ApplicationStatusUpdateInput = z.infer<typeof applicationStatusUpdateSchema>

export const applicationCancelSchema = z.object({
  application_id: z.string().uuid(),
  reason: z.string().min(5, "Indicá el motivo").max(500),
})
export type ApplicationCancelInput = z.infer<typeof applicationCancelSchema>

// ============================================================
// DOCUMENT
// ============================================================
export const documentUploadMetadataSchema = z.object({
  application_id: z.string().uuid(),
  client_id: z.string().uuid(),
  document_type: z.enum(DOCUMENT_TYPES),
  file_name: z.string().min(1).max(250),
  file_size_bytes: z.number().int().positive(),
  mime_type: z.string().max(100),
})
export type DocumentUploadMetadataInput = z.infer<typeof documentUploadMetadataSchema>

export const documentReviewSchema = z.object({
  document_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  review_notes: z.string().max(1000).optional(),
})
export type DocumentReviewInput = z.infer<typeof documentReviewSchema>

// ============================================================
// DICTAMEN
// ============================================================
export const dictamenCreateSchema = z
  .object({
    application_id: z.string().uuid(),
    decision: z.enum(DICTAMEN_DECISIONS),
    approved_amount: z.number().positive().optional().nullable(),
    term_months: z.number().int().min(1).max(360).optional().nullable(),
    interest_rate: z.number().min(0).max(1000).optional().nullable(),
    conditions: z.string().max(2000).optional().or(z.literal("")),
    observations: z.string().max(2000).optional().or(z.literal("")),
    justification: z.string().min(10, "La justificación es obligatoria").max(5000),
  })
  .refine(
    (d) => {
      if (d.decision === "approved") {
        return d.approved_amount != null && d.term_months != null
      }
      return true
    },
    {
      message: "Si aprobás, debés indicar monto y plazo",
      path: ["approved_amount"],
    }
  )
  .refine(
    (d) => {
      if (d.decision === "observed") {
        return !!d.observations && d.observations.length > 0
      }
      return true
    },
    {
      message: "Si observás, debés indicar las observaciones",
      path: ["observations"],
    }
  )
export type DictamenCreateInput = z.infer<typeof dictamenCreateSchema>

// ============================================================
// COMMENT
// ============================================================
export const commentCreateSchema = z.object({
  application_id: z.string().uuid(),
  body: z.string().min(1, "El comentario no puede estar vacío").max(2000),
  is_internal: z.boolean().default(true),
})
export type CommentCreateInput = z.infer<typeof commentCreateSchema>
