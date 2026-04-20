import type { ClientType, DocStatus, ClientState, RiskRating } from './types'

// Client Types with labels
export const CLIENT_TYPES: { value: ClientType; label: string; icon: string }[] = [
  { value: 'monotributo', label: 'Monotributo', icon: 'User' },
  { value: 'RI', label: 'Responsable Inscripto', icon: 'FileText' },
  { value: 'SRL', label: 'SRL', icon: 'Users' },
  { value: 'SA', label: 'SA', icon: 'Building2' },
  { value: 'cooperativa', label: 'Cooperativa', icon: 'Handshake' },
  { value: 'entidadFinanciera', label: 'Entidad Financiera', icon: 'Landmark' },
]

// Document Status labels and colors
export const DOC_STATUS_CONFIG: Record<DocStatus, { label: string; bg: string; text: string; border: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-[#F4F5F9]', text: 'text-[#6B7280]', border: 'border-[#E5E7EB]' },
  subido: { label: 'Subido', bg: 'bg-[#E8EDFD]', text: 'text-[#1B3FD8]', border: 'border-[#1B3FD8]/20' },
  enRevision: { label: 'En revisión', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#F59E0B]/30' },
  aprobado: { label: 'Aprobado', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]', border: 'border-[#22C55E]/30' },
  rechazado: { label: 'Rechazado', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]', border: 'border-[#EF4444]/30' },
}

// Client State labels
export const CLIENT_STATE_CONFIG: Record<ClientState, { label: string; bg: string; text: string; border: string }> = {
  pendienteDocumentos: { label: 'Pendiente de documentos', bg: 'bg-[#F4F5F9]', text: 'text-[#6B7280]', border: 'border-[#E5E7EB]' },
  enRevision: { label: 'En revisión', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#F59E0B]/30' },
  aprobado: { label: 'Aprobado', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]', border: 'border-[#22C55E]/30' },
  rechazado: { label: 'Rechazado', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]', border: 'border-[#EF4444]/30' },
  incompleto: { label: 'Incompleto', bg: 'bg-[#FFF7ED]', text: 'text-[#9A3412]', border: 'border-[#F97316]/30' },
}

// Sectors
export const SECTORS = [
  'Comercio mayorista',
  'Comercio minorista',
  'Agricultura',
  'Ganadería',
  'Servicios informáticos',
  'Manufactura',
  'Imprenta / editorial',
  'Construcción',
  'Transporte',
  'Alimentos y bebidas',
  'Finanzas',
  'Salud',
  'Educación',
  'Turismo',
  'Servicios profesionales',
]

// Provinces of Argentina
export const PROVINCES = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
]

// Monotributo Categories
export const MONOTRIBUTO_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']

// Risk Ratings
export const RISK_RATINGS: RiskRating[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']

// Entity Types (for Financial Entities)
export const ENTITY_TYPES = [
  'Banco comercial',
  'Fintech',
  'SGR',
  'Cooperativa de crédito',
  'Compañía financiera',
]

// Document requirements by client type
export const DOCUMENT_REQUIREMENTS: Record<ClientType, { id: string; nombre: string; obligatorio: boolean }[]> = {
  monotributo: [
    { id: 'dni', nombre: 'DNI titular (frente y dorso)', obligatorio: true },
    { id: 'constancia_afip', nombre: 'Constancia de inscripción AFIP', obligatorio: true },
    { id: 'recibo_monotributo', nombre: 'Último recibo/comprobante de pago monotributo', obligatorio: true },
    { id: 'extracto_bancario', nombre: 'Extracto bancario últimos 3 meses', obligatorio: true },
  ],
  RI: [
    { id: 'dni', nombre: 'DNI titular', obligatorio: true },
    { id: 'constancia_afip', nombre: 'Constancia de inscripción AFIP', obligatorio: true },
    { id: 'balance_1', nombre: 'Estado contable certificado (último)', obligatorio: true },
    { id: 'balance_2', nombre: 'Estado contable certificado (anterior)', obligatorio: true },
    { id: 'ddjj_ganancias_1', nombre: 'Declaración jurada de ganancias (última)', obligatorio: true },
    { id: 'ddjj_ganancias_2', nombre: 'Declaración jurada de ganancias (anterior)', obligatorio: true },
    { id: 'extracto_bancario', nombre: 'Extracto bancario últimos 3 meses', obligatorio: true },
  ],
  SRL: [
    { id: 'estatuto', nombre: 'Estatuto social con últimas modificaciones', obligatorio: true },
    { id: 'acta_autoridades', nombre: 'Acta de designación de autoridades', obligatorio: true },
    { id: 'dni_socios', nombre: 'DNI de cada socio', obligatorio: true },
    { id: 'balance_1', nombre: 'Estado contable certificado 2023', obligatorio: true },
    { id: 'balance_2', nombre: 'Estado contable certificado 2022', obligatorio: true },
    { id: 'balance_3', nombre: 'Estado contable certificado 2021', obligatorio: true },
    { id: 'ddjj_ganancias_1', nombre: 'Declaración jurada de ganancias 2023', obligatorio: true },
    { id: 'ddjj_ganancias_2', nombre: 'Declaración jurada de ganancias 2022', obligatorio: true },
    { id: 'ddjj_ganancias_3', nombre: 'Declaración jurada de ganancias 2021', obligatorio: true },
    { id: 'composicion_accionaria', nombre: 'Composición accionaria certificada', obligatorio: true },
    { id: 'extracto_bancario', nombre: 'Extracto bancario últimos 6 meses', obligatorio: true },
  ],
  SA: [
    { id: 'estatuto', nombre: 'Estatuto social', obligatorio: true },
    { id: 'acta_directorio', nombre: 'Acta de directorio vigente', obligatorio: true },
    { id: 'dni_directores', nombre: 'DNI de directores y accionistas mayoritarios', obligatorio: true },
    { id: 'balance_1', nombre: 'Estado contable certificado con dictamen 2023', obligatorio: true },
    { id: 'balance_2', nombre: 'Estado contable certificado con dictamen 2022', obligatorio: true },
    { id: 'balance_3', nombre: 'Estado contable certificado con dictamen 2021', obligatorio: true },
    { id: 'ddjj_ganancias_1', nombre: 'Declaración jurada de ganancias 2023', obligatorio: true },
    { id: 'ddjj_ganancias_2', nombre: 'Declaración jurada de ganancias 2022', obligatorio: true },
    { id: 'ddjj_ganancias_3', nombre: 'Declaración jurada de ganancias 2021', obligatorio: true },
    { id: 'nomina_accionistas', nombre: 'Nómina de accionistas certificada', obligatorio: true },
    { id: 'extracto_bancario', nombre: 'Extracto bancario últimos 6 meses', obligatorio: true },
  ],
  cooperativa: [
    { id: 'estatuto', nombre: 'Estatuto y reglamento interno', obligatorio: true },
    { id: 'acta_autoridades', nombre: 'Acta de autoridades vigentes', obligatorio: true },
    { id: 'matricula_inaes', nombre: 'Matrícula cooperativa (INAES)', obligatorio: true },
    { id: 'balance_1', nombre: 'Estado contable 2023', obligatorio: true },
    { id: 'balance_2', nombre: 'Estado contable 2022', obligatorio: true },
    { id: 'dni_autoridades', nombre: 'DNI de autoridades', obligatorio: true },
  ],
  entidadFinanciera: [
    { id: 'autorizacion_bcra', nombre: 'Autorización BCRA', obligatorio: true },
    { id: 'estatuto', nombre: 'Estatuto social', obligatorio: true },
    { id: 'memoria_balance', nombre: 'Memoria y balance anual', obligatorio: true },
    { id: 'informe_auditoria', nombre: 'Informe de auditoría externa', obligatorio: true },
    { id: 'integracion_capital', nombre: 'Integración de capital regulatorio', obligatorio: true },
  ],
}

// Validation Checklist Items
export const VALIDATION_CHECKLIST = [
  { id: 'identidad', label: 'Identidad verificada' },
  { id: 'cuit_activo', label: 'CUIT activo en AFIP' },
  { id: 'sin_deudas', label: 'Sin deudas en Veraz/BCRA' },
  { id: 'dictamen_auditor', label: 'Estados contables con dictamen de auditor' },
  { id: 'docs_vigentes', label: 'Documentos societarios vigentes' },
  { id: 'actividad_consistente', label: 'Actividad consistente con la declarada' },
  { id: 'garantias', label: 'Garantías identificadas' },
]
