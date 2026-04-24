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
  admin: "/staff",
  officer: "/staff",
  analyst: "/staff",
  client: "/cliente",
}

/**
 * Roles que tienen acceso a la vista interna /staff.
 * Cualquier staff puede ver y operar todos los pasos del legajo.
 */
export const STAFF_ROLES: UserRole[] = ["officer", "analyst", "admin"]

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role)
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
  "mutual",
] as const
export type ClientType = (typeof CLIENT_TYPES)[number]

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  monotributo: "Monotributo",
  responsable_inscripto: "Responsable Inscripto",
  srl: "SRL",
  sa: "SA",
  cooperativa: "Cooperativa",
  mutual: "Mutual",
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
// FUNDING LINE (línea de fondeo - se elige en el onboarding, paso 4)
// ============================================================
export const FUNDING_LINES = ["fgplus", "financing_general"] as const
export type FundingLine = (typeof FUNDING_LINES)[number]

export const FUNDING_LINE_LABELS: Record<FundingLine, string> = {
  fgplus: "FGPlus",
  financing_general: "Financiamiento General",
}

export const FUNDING_LINE_DESCRIPTIONS: Record<FundingLine, string> = {
  fgplus:
    "Para entidades financieras que prestan a sus socios o clientes. Pedimos composición de cartera, políticas de originación y cobranza.",
  financing_general:
    "Para PyMEs con necesidad de capital. Pedimos plan de negocios, flujo proyectado y avales personales según el caso.",
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
  "awaiting_funding_line_choice",
  "additional_docs_pending",
  "additional_docs_review",
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
  authorized: "En análisis inicial",
  docs_in_review: "En análisis inicial",
  awaiting_funding_line_choice: "Elegí tu línea",
  additional_docs_pending: "Documentación adicional",
  additional_docs_review: "Revisión económico-financiera",
  docs_requested: "Solicitud de documentación adicional",
  in_risk_analysis: "En análisis crediticio",
  observed: "En análisis crediticio",
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
  "awaiting_funding_line_choice",
  "additional_docs_pending",
  "additional_docs_review",
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
  // Documentación inicial (fase 1)
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
  // Documentación adicional FGPlus
  "composicion_cartera",
  "politica_originacion",
  "politica_cobranza",
  "convenio_terceros",
  // Documentación adicional Financiamiento General
  "aval_personal",
  "plan_negocios",
  "flujo_ventas_proyectado",
  "otro_adicional",
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
  composicion_cartera: "Composición de cartera (Excel)",
  politica_originacion: "Política de originación",
  politica_cobranza: "Política de cobranza",
  convenio_terceros: "Convenio con terceros",
  aval_personal: "Aval personal",
  plan_negocios: "Plan de negocios",
  flujo_ventas_proyectado: "Flujo de ventas proyectado",
  otro_adicional: "Otro documento",
}

/**
 * Documentos INICIALES requeridos según el tipo de cliente (paso 2).
 * Los documentos adicionales dependen de la línea de fondeo elegida
 * y se gestionan por additional_document_requests.
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
  mutual: [
    "dni_titular",
    "constancia_afip",
    "estatuto_social",
    "actas",
    "estado_contable_ultimo",
    "extracto_bancario",
  ],
}

/**
 * Presets de documentos que se piden automáticamente cuando el cliente
 * eligió FGPlus en el onboarding. Son los 3 docs core de FGPlus.
 */
export const FGPLUS_PRESET_DOCS: Array<{
  document_type: DocumentType
  document_name: string
  description: string
  is_required: boolean
}> = [
  {
    document_type: "composicion_cartera",
    document_name: "Composición de cartera (Excel)",
    description:
      "Archivo Excel con 3 bloques: detalle del cliente, cronograma/caída de cuotas, y forma de pago/cobranza.",
    is_required: true,
  },
  {
    document_type: "politica_originacion",
    document_name: "Política de originación",
    description:
      "PDF o Word que describa cómo prestan: criterios, montos, plazos, edad del cliente, excepciones autorizadas.",
    is_required: true,
  },
  {
    document_type: "politica_cobranza",
    document_name: "Política de cobranza",
    description:
      "PDF o Word que describa cómo cobran: canales (descuento de haberes, débito, pago voluntario), códigos, convenios.",
    is_required: true,
  },
]

/**
 * Presets del checklist del analista para Financiamiento General.
 * El analista elige cuáles tildar + agregar custom con "Otros".
 */
export const FINANCING_GENERAL_CHECKLIST: Array<{
  document_type: DocumentType
  document_name: string
  description: string
}> = [
  {
    document_type: "aval_personal",
    document_name: "Aval personal",
    description: "Garantía personal de socio/director.",
  },
  {
    document_type: "plan_negocios",
    document_name: "Plan de negocios",
    description: "Plan de negocios del proyecto o empresa.",
  },
  {
    document_type: "flujo_ventas_proyectado",
    document_name: "Flujo de ventas proyectado",
    description: "Proyección de ingresos mensual para el período del crédito.",
  },
]

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
// DOCUMENT PHASE (fase a la que pertenece un documento)
// ============================================================
export const DOCUMENT_PHASES = ["initial", "additional"] as const
export type DocumentPhase = (typeof DOCUMENT_PHASES)[number]

export const DOCUMENT_PHASE_LABELS: Record<DocumentPhase, string> = {
  initial: "Documentación inicial",
  additional: "Documentación adicional",
}

// ============================================================
// ADDITIONAL DOCUMENT REQUEST STATUS
// ============================================================
export const ADDL_DOC_REQUEST_STATUSES = [
  "pending",
  "fulfilled",
  "approved",
  "rejected",
  "cancelled",
] as const
export type AddlDocRequestStatus = (typeof ADDL_DOC_REQUEST_STATUSES)[number]

export const ADDL_DOC_REQUEST_STATUS_LABELS: Record<AddlDocRequestStatus, string> = {
  pending: "Pendiente",
  fulfilled: "Subido",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
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
// Agrupa los estados internos en 10 buckets de UX. Útil para:
//  - Renderizar el timeline de 7 pasos (qué "paso" está activo)
//  - Hero dinámico del dashboard (qué mensaje mostrar)
//  - Tono del mensaje (info / warning / success / error)
//
// NOTA: `awaiting_funding_line_choice` queda por compatibilidad pero
// NO se usa en el flujo nuevo (la línea se elige en el onboarding).

export const STATUS_BUCKETS = [
  "draft",
  "pending_review",
  "in_analysis",
  "docs_requested",
  "awaiting_funding_line_choice",
  "additional_docs_pending",
  "additional_docs_review",
  "in_credit_analysis",
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
    case "awaiting_funding_line_choice":
      return "awaiting_funding_line_choice"
    case "additional_docs_pending":
      return "additional_docs_pending"
    case "additional_docs_review":
      return "additional_docs_review"
    case "in_risk_analysis":
    case "observed":
      return "in_credit_analysis"
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
 * Timeline de 7 pasos del proceso del legajo (flujo nuevo).
 * El paso "Elegí tu línea" desapareció porque el cliente lo elige
 * en el onboarding antes de enviar.
 *
 * El paso 2 "Documentación inicial" representa la ENTREGA de docs iniciales
 * (se marca como completado apenas el cliente envía la solicitud).
 * El paso 3 "Análisis" es donde vive el legajo mientras el oficial revisa.
 *
 * Los labels en idioma del cliente viven en los componentes de UI.
 * Acá los shortLabel quedan técnicos para uso interno/fallback.
 */
export const TIMELINE_STEPS = [
  { bucket: "draft", label: "Contanos sobre vos", shortLabel: "Datos" },
  { bucket: "pending_review", label: "Documentación inicial", shortLabel: "Doc inicial" },
  { bucket: "in_analysis", label: "Analizamos tus documentos", shortLabel: "Análisis" },
  { bucket: "additional_docs_pending", label: "Sumá la documentación de tu línea", shortLabel: "Docs extra" },
  { bucket: "additional_docs_review", label: "Revisamos lo que sumaste", shortLabel: "Revisión" },
  { bucket: "in_credit_analysis", label: "Analizamos tu solicitud", shortLabel: "Crediticio" },
  { bucket: "approved", label: "Tenés una respuesta", shortLabel: "Resultado" },
] as const satisfies ReadonlyArray<{
  bucket: StatusBucket
  label: string
  shortLabel: string
}>

/**
 * Dado un bucket, devuelve el índice del paso correspondiente en TIMELINE_STEPS.
 *
 * Clave del mapeo: apenas el cliente envía (submitted → pending_review),
 * el dot salta directo al paso 3 (Análisis). El paso 2 (Doc inicial) queda
 * como completado porque la entrega ya ocurrió.
 *
 * - docs_requested → vuelve al paso 3 (sigue en análisis con observaciones)
 * - awaiting_funding_line_choice → deprecado, mapea al paso 3 (no debería ocurrir)
 * - rejected/cancelled → índice del último paso (Resultado)
 */
export function getTimelineIndex(bucket: StatusBucket): number {
  switch (bucket) {
    case "draft":
      return 0
    case "pending_review":
    case "in_analysis":
    case "docs_requested":
    case "awaiting_funding_line_choice":
      return 2
    case "additional_docs_pending":
      return 3
    case "additional_docs_review":
      return 4
    case "in_credit_analysis":
      return 5
    case "approved":
    case "rejected":
    case "cancelled":
      return 6
  }
}

// ============================================================
// STAFF BUCKETS (UX) - agrupación para la bandeja del staff
// ============================================================

export const STAFF_BUCKETS = [
  "unassigned",
  "action_worcap",
  "waiting_client",
  "closed",
] as const
export type StaffBucket = (typeof STAFF_BUCKETS)[number]

export const STAFF_BUCKET_LABELS: Record<StaffBucket, string> = {
  unassigned: "Sin asignar",
  action_worcap: "Acción WORCAP",
  waiting_client: "Esperando cliente",
  closed: "Cerrados",
}

export const STAFF_BUCKET_DESCRIPTIONS: Record<StaffBucket, string> = {
  unassigned: "Legajos nuevos sin oficial asignado",
  action_worcap: "Hay algo para hacer del lado de WORCAP",
  waiting_client: "Estamos esperando que el cliente actúe",
  closed: "Legajos finalizados (aprobados, rechazados o cancelados)",
}

/**
 * Dado el estado y la asignación de un legajo, devuelve el bucket
 * de UX desde el punto de vista del staff.
 */
export function getStaffBucket(
  status: ApplicationStatus,
  hasAssignedOfficer: boolean
): StaffBucket {
  if (isFinalStatus(status)) {
    return "closed"
  }

  if (!hasAssignedOfficer) {
    return "unassigned"
  }

  const actionWorcapStatuses: ApplicationStatus[] = [
    "submitted",
    "pending_authorization",
    "authorized",
    "docs_in_review",
    "additional_docs_review",
    "in_risk_analysis",
    "observed",
  ]
  if (actionWorcapStatuses.includes(status)) {
    return "action_worcap"
  }

  return "waiting_client"
}

/**
 * Color visual para cada bucket de staff. Para badges y filtros.
 */
export type StaffBucketColor = {
  bg: string
  text: string
  border: string
  dot: string
}

export const STAFF_BUCKET_COLORS: Record<StaffBucket, StaffBucketColor> = {
  unassigned: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    dot: "bg-gray-400",
  },
  action_worcap: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-[#1b38e8]",
  },
  waiting_client: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  closed: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
    dot: "bg-gray-300",
  },
}
