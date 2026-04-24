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
 */
export const STAFF_ROLES: UserRole[] = ["officer", "analyst", "admin"]

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role)
}

// ============================================================
// CLIENT TYPE
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
// FUNDING LINE
// ============================================================
export const FUNDING_LINES = ["fgplus", "financing_general"] as const
export type FundingLine = (typeof FUNDING_LINES)[number]

export const FUNDING_LINE_LABELS: Record<FundingLine, string> = {
  fgplus: "FGPlus",
  financing_general: "Financiamiento General",
}

export const FUNDING_LINE_DESCRIPTIONS: Record<FundingLine, string> = {
  fgplus:
    "Para entidades financieras que prestan a sus socios o clientes. Pedimos composición de cartera, política de originación y el detalle de tu política de cobranza.",
  financing_general:
    "Para PyMEs con necesidad de capital. Pedimos plan de negocios, flujo proyectado y avales personales según el caso.",
}

// ============================================================
// APPLICATION STATUS
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
  additional_docs_pending: "Pedido de información",
  additional_docs_review: "Revisando pedido de información",
  docs_requested: "Solicitud de documentación adicional",
  in_risk_analysis: "En análisis crediticio",
  observed: "En análisis crediticio",
  approved: "Finalizada — Aprobada",
  rejected_by_officer: "Finalizada — Rechazada",
  rejected_by_analyst: "Finalizada — Rechazada",
  cancelled_by_client: "Cancelada por vos",
  cancelled_by_worcap: "Cancelada por WORCAP",
}

export const FINAL_STATUSES: ApplicationStatus[] = [
  "approved",
  "rejected_by_officer",
  "rejected_by_analyst",
  "cancelled_by_client",
  "cancelled_by_worcap",
]

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
  "autorizacion_descuento",
  "cartera_detalle_clientes",
  "cartera_caida_cuotas",
  "cartera_formas_pago",
  "cartera_otro",
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
  composicion_cartera: "Composición de cartera",
  politica_originacion: "Política de originación",
  politica_cobranza: "Política de cobranza",
  convenio_terceros: "Convenio con terceros",
  autorizacion_descuento: "Autorización de descuento",
  cartera_detalle_clientes: "Detalle del cliente",
  cartera_caida_cuotas: "Caída de cuotas",
  cartera_formas_pago: "Formas de pago",
  cartera_otro: "Otra información de cartera",
  aval_personal: "Aval personal",
  plan_negocios: "Plan de negocios",
  flujo_ventas_proyectado: "Flujo de ventas proyectado",
  otro_adicional: "Otro documento",
}

/**
 * Documentos INICIALES requeridos según el tipo de cliente.
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

// ============================================================
// FGPLUS - SLOTS DE COMPOSICIÓN DE CARTERA
// ============================================================
// Cuando el cliente elige FGPlus, le pedimos varios archivos Excel
// porque cada cliente tiene su composición de cartera en formatos
// distintos. 3 slots sugeridos + 2 extra + "agregar más".

export type CarteraSlot = {
  label: string
  description: string
  suggested: boolean
}

export const FGPLUS_CARTERA_SLOTS: CarteraSlot[] = [
  {
    label: "Detalle del cliente",
    description:
      "Información por deudor: nombre, DNI, monto, cuotas, fecha de alta.",
    suggested: true,
  },
  {
    label: "Caída de cuotas",
    description:
      "Cronograma de vencimientos: qué cuotas caen cada mes, cuánto capital y cuánto interés.",
    suggested: true,
  },
  {
    label: "Formas de pago",
    description:
      "Detalle de cómo cobra cada crédito: código de descuento, convenio, canal.",
    suggested: true,
  },
  {
    label: "",
    description: "Subí otro archivo Excel si tu cartera tiene información adicional.",
    suggested: false,
  },
  {
    label: "",
    description: "Subí otro archivo Excel si tu cartera tiene información adicional.",
    suggested: false,
  },
]

// ============================================================
// FGPLUS - CANALES DE COBRANZA (árbol)
// ============================================================

export const COLLECTION_CHANNELS = [
  "descuento_haberes",
  "debito_cuenta",
  "pago_voluntario",
] as const
export type CollectionChannel = (typeof COLLECTION_CHANNELS)[number]

export const COLLECTION_CHANNEL_LABELS: Record<CollectionChannel, string> = {
  descuento_haberes: "Descuento de haberes",
  debito_cuenta: "Débito en cuenta",
  pago_voluntario: "Pago voluntario",
}

export const COLLECTION_CHANNEL_DESCRIPTIONS: Record<CollectionChannel, string> = {
  descuento_haberes:
    "La cuota se descuenta directamente del sueldo del deudor. Es el canal con menor mora.",
  debito_cuenta:
    "La cuota se debita de la cuenta bancaria del deudor.",
  pago_voluntario:
    "El deudor paga activamente cada mes. Es el canal con mayor exigencia para el cliente.",
}

// Sub-opción: si hay débito en cuenta, qué tipo de cuenta
export const DEBITO_TIPOS = ["cuenta_corriente", "caja_ahorro"] as const
export type DebitoTipo = (typeof DEBITO_TIPOS)[number]

export const DEBITO_TIPO_LABELS: Record<DebitoTipo, string> = {
  cuenta_corriente: "Cuenta corriente",
  caja_ahorro: "Caja de ahorro",
}

// ============================================================
// FGPLUS - TITULARIDAD DEL CÓDIGO DE DESCUENTO
// ============================================================

export const COLLECTION_CODE_OWNERSHIPS = [
  "propio",
  "tercero_directo",
  "tercero_sub_cedido",
] as const
export type CollectionCodeOwnership = (typeof COLLECTION_CODE_OWNERSHIPS)[number]

export const COLLECTION_CODE_OWNERSHIP_LABELS: Record
  CollectionCodeOwnership,
  string
> = {
  propio: "Propio",
  tercero_directo: "De otra entidad que me lo cede",
  tercero_sub_cedido: "De una cadena de cesión (A → B → yo)",
}

export const COLLECTION_CODE_OWNERSHIP_DESCRIPTIONS: Record
  CollectionCodeOwnership,
  string
> = {
  propio:
    "El código te pertenece directamente. Solo necesitás la autorización del ente que descuenta.",
  tercero_directo:
    "Otra entidad (ej: otra mutual) te presta su código. Necesitás un convenio con esa entidad + la autorización del ente que descuenta.",
  tercero_sub_cedido:
    "Una entidad tiene el código original, se lo cedió a otra, y esta segunda te lo presta a vos. Necesitás 2 convenios + 2 autorizaciones.",
}

// ============================================================
// FGPLUS - PRESETS DEL PEDIDO DE INFORMACIÓN
// ============================================================
// Cuando el oficial avanza un legajo FGPlus a "Pedido de información",
// estas son las cosas que el cliente tiene que completar:
//
//   1. Composición de cartera (5 slots de Excel + agregar más)
//      → NO son additional_document_requests, son uploads libres
//
//   2. Política de originación (1 archivo suelto)
//      → Sí es un additional_document_request
//
//   3. Política de cobranza (árbol completo)
//      → Guardado en funding_line_responses + collection_codes
//      → NO es un document, es un sub-flujo propio
//
// Así que el único preset_doc que creamos automáticamente es el #2.

export const FGPLUS_PRESET_DOCS: Array<{
  document_type: DocumentType
  document_name: string
  description: string
  is_required: boolean
}> = [
  {
    document_type: "politica_originacion",
    document_name: "Política de originación",
    description:
      "Un documento (PDF o Word) que describa cómo prestás: criterios, montos máximos, plazos, edades, excepciones autorizadas por el directorio.",
    is_required: true,
  },
]

// ============================================================
// FINANCING GENERAL - PRESETS DEL PEDIDO DE INFORMACIÓN
// ============================================================
// FG sigue con su flujo simple: 3 docs sueltos como additional_document_requests.
// NO tiene árbol ni composición de cartera.

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
// DOCUMENT PHASE
// ============================================================
export const DOCUMENT_PHASES = ["initial", "additional"] as const
export type DocumentPhase = (typeof DOCUMENT_PHASES)[number]

export const DOCUMENT_PHASE_LABELS: Record<DocumentPhase, string> = {
  initial: "Documentación inicial",
  additional: "Pedido de información",
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
// STATUS BUCKETS (UX)
// ============================================================

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
 */
export const TIMELINE_STEPS = [
  { bucket: "draft", label: "Contanos sobre vos", shortLabel: "Datos" },
  { bucket: "pending_review", label: "Documentación inicial", shortLabel: "Doc inicial" },
  { bucket: "in_analysis", label: "Analizamos tus documentos", shortLabel: "Análisis" },
  { bucket: "additional_docs_pending", label: "Pedido de información", shortLabel: "Pedido info" },
  { bucket: "additional_docs_review", label: "Revisamos tu pedido de información", shortLabel: "Revisión" },
  { bucket: "in_credit_analysis", label: "Analizamos tu solicitud", shortLabel: "Crediticio" },
  { bucket: "approved", label: "Tenés una respuesta", shortLabel: "Resultado" },
] as const satisfies ReadonlyArray<{
  bucket: StatusBucket
  label: string
  shortLabel: string
}>

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
// STAFF BUCKETS
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
