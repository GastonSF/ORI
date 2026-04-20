// Client Types
export type ClientType = 'monotributo' | 'RI' | 'SRL' | 'SA' | 'cooperativa' | 'entidadFinanciera'

// Document Status
export type DocStatus = 'pendiente' | 'subido' | 'enRevision' | 'aprobado' | 'rechazado'

// App Roles
export type AppRole = 'cliente' | 'oficial' | 'analista' | null

// Toast Types
export type ToastType = 'success' | 'warning' | 'error' | 'info'

// Risk Rating
export type RiskRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC'

// Client State
export type ClientState = 
  | 'pendienteDocumentos' 
  | 'enRevision' 
  | 'aprobado' 
  | 'rechazado' 
  | 'incompleto'

// Document interface
export interface Document {
  id: string
  nombre: string
  estado: DocStatus
  fechaCarga?: Date
  motivoRechazo?: string
  comentarioAnalista?: string
  obligatorio: boolean
}

// Socio interface (for SRL)
export interface Socio {
  id: string
  nombre: string
  dni: string
  participacion: number
  firmaAutorizada: boolean
}

// Director interface (for SA)
export interface Director {
  id: string
  nombre: string
  cargo: string
  dni: string
  participacion?: number
}

// Autoridad interface (for Cooperativa)
export interface Autoridad {
  id: string
  nombre: string
  cargo: string
  periodo: string
}

// Activity Log Entry
export interface ActivityEntry {
  id: string
  fecha: Date
  accion: string
  usuario: string
  detalle?: string
}

// Financial Scenario
export interface FinancialScenario {
  ingresos: number
  egresos: number
  ebitda: number
  ratioEndeudamiento: number
  coberturaDeuda: number
  probabilidadDefault: number
  calificacion: RiskRating
}

// Client interface
export interface Client {
  id: string
  razonSocial: string
  cuit: string
  tipo: ClientType
  sector: string
  estado: ClientState
  completitud: number
  montoSolicitado: number
  montoAprobado?: number
  plazo: number
  analistaAsignado?: string
  documentos: Document[]
  socios?: Socio[]
  directores?: Director[]
  autoridades?: Autoridad[]
  fechaCreacion: Date
  email?: string
  telefono?: string
  domicilio?: string
  ciudad?: string
  provincia?: string
  codigoPostal?: string
  actividad?: string
  fechaInicioActividad?: Date
  facturacionAnual?: number
  // Monotributo specific
  categoriaMono?: string
  // RI specific
  tieneEmpleados?: boolean
  cantidadEmpleados?: number
  // Cooperativa specific
  numeroMatricula?: string
  // Entidad Financiera specific
  autorizacionBCRA?: string
  tipoEntidad?: string
  capitalMinimo?: number
  // Activity history
  historial?: ActivityEntry[]
  // Internal notes
  notasInternas?: string
  // Validation checklist
  checklist?: ValidationItem[]
  // Financial scenarios
  escenarios?: {
    conservador: FinancialScenario
    base: FinancialScenario
    agresivo: FinancialScenario
  }
  // Days in queue
  diasEnCola?: number
}

// Validation Item
export interface ValidationItem {
  id: string
  label: string
  checked: boolean
  nota?: string
}

// User interface
export interface User {
  id: string
  nombre: string
  email: string
  rol: AppRole
  sucursal?: string
  equipo?: string
  avatar?: string
}

// Toast interface
export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

// Wizard Step
export interface WizardStep {
  id: number
  label: string
  completed: boolean
  current: boolean
}

// App State
export interface AppState {
  role: AppRole
  activeClient: Client | null
  clients: Client[]
  users: User[]
  toasts: Toast[]
  wizardStep: number
  selectedClientId: string | null
}

// Action Types
export type AppAction =
  | { type: 'SET_ROLE'; payload: AppRole }
  | { type: 'SET_ACTIVE_CLIENT'; payload: Client | null }
  | { type: 'SELECT_CLIENT'; payload: string }
  | { type: 'UPDATE_DOC_STATUS'; payload: { clientId: string; docId: string; estado: DocStatus; motivo?: string } }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'ADVANCE_WIZARD_STEP' }
  | { type: 'SET_WIZARD_STEP'; payload: number }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_CHECKLIST'; payload: { clientId: string; itemId: string; checked: boolean; nota?: string } }
  | { type: 'UPDATE_SCENARIOS'; payload: { clientId: string; escenarios: Client['escenarios'] } }

// Sidebar Item
export interface SidebarItem {
  id: string
  label: string
  icon: string
  active?: boolean
}
