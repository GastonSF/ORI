/**
 * Constantes del dominio WORCAP.
 * Los valores string DEBEN coincidir con los enums de Postgres.
 */

// ============================================================
// ROLES
// ============================================================
export const USER_ROLES = ["admin", "officer", "analyst", "client"] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  officer: "Oficial",
  analyst: "Analista de riesgos",
  client: "Cliente",
}

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: "/admin",
  officer: "/oficial",
  analyst: "/analista",
  client: "/cliente",
}

// ============================================================
// CLIENT TYPE (tipo de empresa solicitante)
// ============================================================
export const CLIENT_TYPES = [
  "monotributo",
  "responsable_inscripto",
  "srl",
  "sa",
  "cooperativa",
  "entidad_financiera",
] as const
export type ClientType = (typeof CLIENT_TYPES)[number]

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  monotributo: "Monotributo",
  responsable_inscripto: "Responsable Inscripto",
  srl: "SRL",
  sa: "SA",
  cooperativa: "Cooperativa",
  entidad_financiera: "Entidad Financiera",
}

// ============================================================
// CLIENT STATUS
// ============================================================
export const CLIENT_STATUSES = ["active", "inactive", "blocked"] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  blocked: "Bloqueado",
}

// ============================================================
// APPLICATION STATUS (estados del legajo)
// ============================================================
export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "pending_authorization",
  "authorized",
  "rejected_by_officer",
  "docs_in_review",
  "docs_requested",
  "in_risk_analysis",
  "observed",
  "approved",
  "rejected_by_analyst",
  "cancelled_by_client",
  "cancelled_by_worcap",
] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Borrador",
  submitted: "Pendiente de recepción",
  pending_authorization: "Pendiente de recepción",
  authorized: "En análisis",
  docs_in_review: "En análisis",
  docs_requested: "Solicitud de documentación adicional",
  in_risk_analysis: "En comité",
  observed: "En comité",
  approved: "Finalizada — Aprobada",
  rejected_by_officer: "Finalizada — Rechazada",
  rejected_by_analyst: "Finalizada — Rechazada",
  cancelled_by_client: "Cancelada por vos",
  cancelled_by_worcap: "Cancelada por WORCAP",
}

/**
 * Estados considerados "finales" - el legajo ya no se puede modificar.
 */
export const FINAL_STATUSES: ApplicationStatus[] = [
  "approved",
  "rejected_by_officer",
  "rejected_by_analyst",
  "cancelled_by_client",
  "cancelled_by_worcap",
]

/**
 * Estados en los que el cliente puede cancelar directamente su legajo.
 * Después de `in_risk_analysis`, debe pedírselo al oficial.
 */
export const CLIENT_CANCELLABLE_STATUSES: ApplicationStatus[] = [
  "draft",
  "submitted",
  "pending_authorization",
  "authorized",
  "docs_in_review",
  "docs_requested",
]

export function isFinalStatus(status: ApplicationStatus): boolean {
  return FINAL_STATUSES.includes(status)
}

export function canClientCancel(status: ApplicationStatus): boolean {
  return CLIENT_CANCELLABLE_STATUSES.includes(status)
}

// ============================================================
// DOCUMENT TYPE
// ============================================================
export const DOCUMENT_TYPES = [
  "dni_titular",
  "constancia_afip",
  "estado_contable_ultimo",
  "estado_contable_anterior",
  "ddjj_ganancias_ultima",
  "ddjj_ganancias_anterior",
  "extracto_bancario",
  "estatuto_social",
  "actas",
  "balance",
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  dni_titular: "DNI titular",
  constancia_afip: "Constancia de inscripción AFIP",
  estado_contable_ultimo: "Estado contable certificado (último)",
  estado_contable_anterior: "Estado contable certificado (anterior)",
  ddjj_ganancias_ultima: "Declaración jurada de ganancias (última)",
  ddjj_ganancias_anterior: "Declaración jurada de ganancias (anterior)",
  extracto_bancario: "Extracto bancario últimos 3 meses",
  estatuto_social: "Estatuto social",
  actas: "Actas",
  balance: "Balance",
}

/**
 * Documentos requeridos según el tipo de cliente.
 */
export const REQUIRED_DOCS_BY_CLIENT_TYPE: Record<ClientType, DocumentType[]> = {
  monotributo: [
    "dni_titular",
    "constancia_afip",
    "ddjj_ganancias_ultima",
    "extracto_bancario",
  ],
  responsable_inscripto: [
    "dni_titular",
    "constancia_afip",
    "estado_contable_ultimo",
    "estado_contable_anterior",
    "ddjj_ganancias_ultima",
    "ddjj_ganancias_anterior",
    "extracto_bancario",
  ],
  srl: [
    "dni_titular",
    "constancia_afip",
    "estatuto_social",
    "actas",
    "estado_contable_ultimo",
    "estado_contable_anterior",
    "balance",
    "extracto_bancario",
  ],
  sa: [
    "dni_titular",
    "constancia_afip",
    "estatuto_social",
    "actas",
    "estado_contable_ultimo",
    "estado_contable_anterior",
    "balance",
    "extracto_bancario",
  ],
  cooperativa: [
    "dni_titular",
    "constancia_afip",
    "estatuto_social",
    "actas",
    "estado_contable_ultimo",
    "extracto_bancario",
  ],
  entidad_financiera: [
    "dni_titular",
    "constancia_afip",
    "estatuto_social",
    "balance",
    "estado_contable_ultimo",
    "estado_contable_anterior",
  ],
}

// ============================================================
// DOCUMENT STATUS
// ============================================================
export const DOCUMENT_STATUSES = ["pending", "uploaded", "approved", "rejected"] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Pendiente",
  uploaded: "Subido",
  approved: "Aprobado",
  rejected: "Rechazado",
}

// ============================================================
// DICTAMEN DECISION
// ============================================================
export const DICTAMEN_DECISIONS = ["approved", "rejected", "observed"] as const
export type DictamenDecision = (typeof DICTAMEN_DECISIONS)[number]

export const DICTAMEN_DECISION_LABELS: Record<DictamenDecision, string> = {
  approved: "Aprobado",
  rejected: "Rechazado",
  observed: "Observado",
}

// ============================================================
// STATUS BUCKETS (UX) - agrupación para presentación visual
// ============================================================
//
// Agrupa los 13 estados internos en 7 buckets de UX. Útil para:
//  - Renderizar el timeline de pasos (qué "paso" está activo)
//  - Hero dinámico del dashboard (qué mensaje mostrar)
//  - Tono del mensaje (info / warning / success / error)

export const STATUS_BUCKETS = [
  "draft",
  "pending_review",
  "in_analysis",
  "docs_requested",
  "in_committee",
  "approved",
  "rejected",
  "cancelled",
] as const
export type StatusBucket = (typeof STATUS_BUCKETS)[number]

export function getStatusBucket(status: ApplicationStatus): StatusBucket {
  switch (status) {
    case "draft":
      return "draft"
    case "submitted":
    case "pending_authorization":
      return "pending_review"
    case "authorized":
    case "docs_in_review":
      return "in_analysis"
    case "docs_requested":
      return "docs_requested"
    case "in_risk_analysis":
    case "observed":
      return "in_committee"
    case "approved":
      return "approved"
    case "rejected_by_officer":
    case "rejected_by_analyst":
      return "rejected"
    case "cancelled_by_client":
    case "cancelled_by_worcap":
      return "cancelled"
  }
}

/**
 * Pasos lineales del proceso del legajo (para el timeline).
 * Los estados terminales (rejected/cancelled) no tienen paso propio -
 * se muestran como "paso final rojo" en el timeline.
 */
export const TIMELINE_STEPS = [
  { bucket: "draft", label: "Borrador", shortLabel: "Borrador" },
  { bucket: "pending_review", label: "Pendiente de recepción", shortLabel: "Recepción" },
  { bucket: "in_analysis", label: "En análisis", shortLabel: "Análisis" },
  { bucket: "in_committee", label: "En comité", shortLabel: "Comité" },
  { bucket: "approved", label: "Finalizada", shortLabel: "Resultado" },
] as const satisfies ReadonlyArray<{
  bucket: StatusBucket
  label: string
  shortLabel: string
}>

/**
 * Dado un bucket, devuelve el índice del paso correspondiente en TIMELINE_STEPS.
 * - docs_requested → el cliente vuelve al paso "Pendiente de recepción" (tiene que re-enviar)
 * - rejected/cancelled → índice del último paso (Finalizada) pero con flag de "failed"
 */
export function getTimelineIndex(bucket: StatusBucket): number {
  switch (bucket) {
    case "draft":
      return 0
    case "pending_review":
    case "docs_requested":
      return 1
    case "in_analysis":
      return 2
    case "in_committee":
      return 3
    case "approved":
    case "rejected":
    case "cancelled":
      return 4
  }
}
