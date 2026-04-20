/**
 * Tipos TypeScript del schema de WORCAP en Supabase.
 *
 * Mantener sincronizado con las migraciones SQL. Para regenerar automáticamente
 * se puede usar en el futuro:
 *   npx supabase gen types typescript --project-id agsnfkwkmsycsgrzmqiy > types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUMS
// ============================================================
export type UserRoleDB = "admin" | "officer" | "analyst" | "client"

export type ClientTypeDB =
  | "monotributo"
  | "responsable_inscripto"
  | "srl"
  | "sa"
  | "cooperativa"
  | "entidad_financiera"

export type ClientStatusDB = "active" | "inactive" | "blocked"

export type ApplicationStatusDB =
  | "draft"
  | "submitted"
  | "pending_authorization"
  | "authorized"
  | "rejected_by_officer"
  | "docs_in_review"
  | "docs_requested"
  | "in_risk_analysis"
  | "observed"
  | "approved"
  | "rejected_by_analyst"
  | "cancelled_by_client"
  | "cancelled_by_worcap"

export type ApplicationOwnerRoleDB = "client" | "officer" | "analyst"

export type DocumentTypeDB =
  | "dni_titular"
  | "constancia_afip"
  | "estado_contable_ultimo"
  | "estado_contable_anterior"
  | "ddjj_ganancias_ultima"
  | "ddjj_ganancias_anterior"
  | "extracto_bancario"
  | "estatuto_social"
  | "actas"
  | "balance"

export type DocumentStatusDB = "pending" | "uploaded" | "approved" | "rejected"

export type DictamenDecisionDB = "approved" | "rejected" | "observed"

// ============================================================
// Database
// ============================================================
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRoleDB
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: UserRoleDB
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRoleDB
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      clients: {
        Row: {
          id: string
          owner_user_id: string
          client_type: ClientTypeDB
          legal_name: string
          cuit: string
          contact_email: string
          contact_phone: string | null
          fiscal_address: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          main_activity: string | null
          activity_start_date: string | null
          annual_revenue: number | null
          status: ClientStatusDB
          onboarding_step: number
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          client_type: ClientTypeDB
          legal_name: string
          cuit: string
          contact_email: string
          contact_phone?: string | null
          fiscal_address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          main_activity?: string | null
          activity_start_date?: string | null
          annual_revenue?: number | null
          status?: ClientStatusDB
          onboarding_step?: number
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>
      }

      company_structure: {
        Row: {
          id: string
          client_id: string
          full_name: string
          dni: string
          role: string
          participation_pct: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          full_name: string
          dni: string
          role: string
          participation_pct?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["company_structure"]["Insert"]>
      }

      applications: {
        Row: {
          id: string
          application_number: string
          client_id: string
          requested_amount: number | null
          requested_term_months: number | null
          purpose: string | null
          status: ApplicationStatusDB
          assigned_officer_id: string | null
          current_owner_role: ApplicationOwnerRoleDB
          submitted_at: string | null
          authorized_at: string | null
          officer_reviewed_at: string | null
          sent_to_analyst_at: string | null
          dictamen_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_number?: string
          client_id: string
          requested_amount?: number | null
          requested_term_months?: number | null
          purpose?: string | null
          status?: ApplicationStatusDB
          assigned_officer_id?: string | null
          current_owner_role?: ApplicationOwnerRoleDB
          submitted_at?: string | null
          authorized_at?: string | null
          officer_reviewed_at?: string | null
          sent_to_analyst_at?: string | null
          dictamen_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>
      }

      documents: {
        Row: {
          id: string
          application_id: string
          client_id: string
          document_type: DocumentTypeDB
          file_path: string
          file_name: string
          file_size_bytes: number | null
          mime_type: string | null
          status: DocumentStatusDB
          uploaded_by: string
          uploaded_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          source_document_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          client_id: string
          document_type: DocumentTypeDB
          file_path: string
          file_name: string
          file_size_bytes?: number | null
          mime_type?: string | null
          status?: DocumentStatusDB
          uploaded_by: string
          uploaded_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          source_document_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>
      }

      dictamenes: {
        Row: {
          id: string
          application_id: string
          analyst_id: string
          decision: DictamenDecisionDB
          approved_amount: number | null
          term_months: number | null
          interest_rate: number | null
          conditions: string | null
          observations: string | null
          justification: string
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          analyst_id: string
          decision: DictamenDecisionDB
          approved_amount?: number | null
          term_months?: number | null
          interest_rate?: number | null
          conditions?: string | null
          observations?: string | null
          justification: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["dictamenes"]["Insert"]>
      }

      comments: {
        Row: {
          id: string
          application_id: string
          author_id: string
          body: string
          is_internal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          author_id: string
          body: string
          is_internal?: boolean
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>
      }

      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          related_entity: Json | null
          read_at: string | null
          email_sent: boolean
          email_sent_at: string | null
          email_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          related_entity?: Json | null
          read_at?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          email_error?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>
      }

      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>
      }
    }
    Views: {}
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRoleDB }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_officer: { Args: Record<string, never>; Returns: boolean }
      is_analyst: { Args: Record<string, never>; Returns: boolean }
      is_client: { Args: Record<string, never>; Returns: boolean }
      is_staff: { Args: Record<string, never>; Returns: boolean }
      owns_client: { Args: { p_client_id: string }; Returns: boolean }
      generate_application_number: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      user_role: UserRoleDB
      client_type: ClientTypeDB
      client_status: ClientStatusDB
      application_status: ApplicationStatusDB
      application_owner_role: ApplicationOwnerRoleDB
      document_type: DocumentTypeDB
      document_status: DocumentStatusDB
      dictamen_decision: DictamenDecisionDB
    }
  }
}

// Helpers: shortcuts para no escribir Database["public"]["Tables"]["x"]["Row"] siempre
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Client = Database["public"]["Tables"]["clients"]["Row"]
export type CompanyMember = Database["public"]["Tables"]["company_structure"]["Row"]
export type Application = Database["public"]["Tables"]["applications"]["Row"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Dictamen = Database["public"]["Tables"]["dictamenes"]["Row"]
export type Comment = Database["public"]["Tables"]["comments"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type AuditLogEntry = Database["public"]["Tables"]["audit_log"]["Row"]
