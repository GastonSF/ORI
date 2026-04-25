import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, FileText, Lightbulb } from "lucide-react"
import { type FundingLine } from "@/lib/constants/roles"
import { AdditionalDocumentRow } from "@/components/cliente/additional-document-row"

/**
 * Subpágina del pedido de información: política de originación.
 *
 * Es un solo upload (PDF o Word) donde el cliente describe cómo presta:
 * criterios, montos, plazos, edades, excepciones autorizadas.
 *
 * Solo aplica a FGPlus en estado additional_docs_pending o additional_docs_review.
 */
export default async function PoliticaOriginacionPage() {
  const { user } = await requireRole("client")
  const supabase = await createClient()

  // Cliente
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) {
    redirect("/cliente/onboarding")
  }

  // Legajo en pedido de información
  const { data: app } = await supabase
    .from("applications")
    .select("id, application_number, status, funding_line")
    .eq("client_id", client.id)
    .in("status", ["additional_docs_pending", "additional_docs_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!app) {
    redirect("/cliente")
  }

  if ((app.funding_line as FundingLine) !== "fgplus") {
    redirect("/cliente/documentos")
  }

  const isReadOnly = app.status === "additional_docs_review"

  // El único request: el que se llama exactamente "Política de originación"
  const { data: request } = await supabase
    .from("additional_document_requests")
    .select(
      `
        id,
        document_name,
        description,
        is_required,
        status,
        review_notes,
        fulfilled_by_document_id
      `
    )
    .eq("application_id", app.id)
    .eq("document_name", "Política de originación")
    .maybeSingle()

  // Si por algún motivo no existe el request, mostramos un mensaje (no debería pasar)
  if (!request) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <Link
          href="/cliente/pedido-informacion"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1b38e8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al pedido de información
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">
            No encontramos el pedido de política de originación. Contactanos.
          </p>
        </div>
      </div>
    )
  }

  // Documento subido (si existe)
  let existingDoc: {
    id: string
    file_name: string
    file_size_bytes: number | null
  } | null = null

  if (request.fulfilled_by_document_id) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id, file_name, file_size_bytes")
      .eq("id", request.fulfilled_by_document_id)
      .maybeSingle()
    if (doc) {
      existingDoc = {
        id: doc.id,
        file_name: doc.file_name,
        file_size_bytes: doc.file_size_bytes,
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/cliente/pedido-informacion"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1b38e8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al pedido de información
        </Link>
      </div>

      {/* Header */}
      <header className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-[#eff3ff] grid place-items-center shrink-0">
            <FileText className="h-6 w-6 text-[#1b38e8]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs font-semibold text-gray-600">
              {app.application_number}
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold text-gray-900">
              Política de originación
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Subí un documento (PDF o Word) que describa cómo prestás. Lo que
              esté ahí lo cruzamos con tu cartera para verificar consistencia.
            </p>
          </div>
        </div>
      </header>

      {/* Aviso si está en read-only */}
      {isReadOnly ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          Ya enviaste el pedido de información. Estás viendo lo que cargaste.
        </div>
      ) : null}

      {/* Tip de qué incluir */}
      {!isReadOnly && !existingDoc ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm text-amber-900">
              <p className="font-semibold">¿Qué tiene que decir el documento?</p>
              <ul className="mt-1.5 space-y-0.5 text-amber-800 list-disc list-inside">
                <li>A quién le prestás (edades, situaciones laborales)</li>
                <li>Montos máximos y plazos máximos</li>
                <li>Criterios de aprobación (relación cuota/ingreso, scoring)</li>
                <li>Cuándo se hacen excepciones y quién las autoriza</li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* El upload */}
      <ul className="space-y-2.5">
        <AdditionalDocumentRow
          request={{
            id: request.id,
            document_name: request.document_name,
            description: request.description,
            is_required: request.is_required,
            status: request.status as "pending" | "fulfilled" | "approved" | "rejected" | "cancelled",
            review_notes: request.review_notes,
            fulfilled_by_document_id: request.fulfilled_by_document_id,
          }}
          applicationId={app.id}
          existingDoc={existingDoc}
          readOnly={isReadOnly}
        />
      </ul>
    </div>
  )
}
