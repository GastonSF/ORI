import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, Package, FileSpreadsheet } from "lucide-react"
import { type FundingLine } from "@/lib/constants/roles"
import { AdditionalDocumentRow } from "@/components/cliente/additional-document-row"
import { AddCarteraSlotButton } from "@/components/cliente/add-cartera-slot-button"

const CARTERA_PREFIX = "Cartera — "

/**
 * Subpágina del pedido de información: composición de cartera.
 *
 * Lista los 5 slots preset (3 sugeridos + 2 extra) más cualquier slot
 * agregado por el cliente. Reusa el componente AdditionalDocumentRow
 * que ya maneja el upload completo.
 *
 * Solo aplica a FGPlus en estado additional_docs_pending o additional_docs_review.
 * Si es FG redirige al flujo viejo. Si está en otro estado, redirige al index.
 */
export default async function CarteraPage() {
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

  // Cargar todos los requests "Cartera —" del legajo
  const { data: rawRequests } = await supabase
    .from("additional_document_requests")
    .select(
      `
        id,
        document_name,
        description,
        is_required,
        is_preset,
        status,
        review_notes,
        fulfilled_by_document_id,
        requested_at
      `
    )
    .eq("application_id", app.id)
    .ilike("document_name", `${CARTERA_PREFIX}%`)
    .order("is_preset", { ascending: false }) // sugeridos primero
    .order("requested_at", { ascending: true })

  const requests = rawRequests ?? []

  // Cargar los documentos asociados (para mostrar archivos subidos)
  const fulfilledIds = requests
    .map((r) => r.fulfilled_by_document_id)
    .filter((id): id is string => !!id)

  let documentsById: Map<string, { id: string; file_name: string; file_size_bytes: number | null }> = new Map()
  if (fulfilledIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_name, file_size_bytes")
      .in("id", fulfilledIds)
    documentsById = new Map(
      (docs ?? []).map((d) => [
        d.id,
        {
          id: d.id,
          file_name: d.file_name,
          file_size_bytes: d.file_size_bytes,
        },
      ])
    )
  }

  // Estadísticas de progreso
  const sugeridos = requests.filter((r) => r.is_preset && r.is_required)
  const sugeridosConArchivo = sugeridos.filter(
    (r) => r.status === "fulfilled" || r.status === "approved"
  )
  const totalConArchivo = requests.filter(
    (r) => r.status === "fulfilled" || r.status === "approved"
  ).length

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
            <Package className="h-6 w-6 text-[#1b38e8]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs font-semibold text-gray-600">
              {app.application_number}
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold text-gray-900">
              Composición de cartera
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Subí los Excel con la información de tus créditos activos. Te
              dejamos 3 sugerencias para arrancar (detalle del cliente, caída
              de cuotas y formas de pago) y podés sumar todos los archivos
              extra que necesites.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <FileSpreadsheet className="h-3 w-3" />
                {sugeridosConArchivo.length} de {sugeridos.length} sugeridos
                subidos
              </span>
              {totalConArchivo > sugeridosConArchivo.length ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  + {totalConArchivo - sugeridosConArchivo.length} extra
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Aviso si está en read-only */}
      {isReadOnly ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          Ya enviaste el pedido de información. Estás viendo lo que cargaste.
        </div>
      ) : null}

      {/* Lista de slots */}
      {requests.length > 0 ? (
        <ul className="space-y-2.5">
          {requests.map((req) => (
            <AdditionalDocumentRow
              key={req.id}
              request={{
                id: req.id,
                document_name: stripPrefix(req.document_name),
                description: req.description,
                is_required: req.is_required,
                status: req.status as "pending" | "fulfilled" | "approved" | "rejected" | "cancelled",
                review_notes: req.review_notes,
                fulfilled_by_document_id: req.fulfilled_by_document_id,
              }}
              applicationId={app.id}
              existingDoc={
                req.fulfilled_by_document_id
                  ? documentsById.get(req.fulfilled_by_document_id) ?? null
                  : null
              }
              readOnly={isReadOnly}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">
            No hay archivos de cartera pedidos. Esto no debería pasar — contactanos.
          </p>
        </div>
      )}

      {/* Botón "Agregar otro archivo" */}
      {!isReadOnly ? (
        <div className="pt-2">
          <AddCarteraSlotButton applicationId={app.id} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Quita el prefijo "Cartera — " del nombre del request
 * para que la fila muestre solo "Detalle del cliente" en vez de
 * "Cartera — Detalle del cliente".
 */
function stripPrefix(name: string): string {
  if (name.startsWith(CARTERA_PREFIX)) {
    return name.slice(CARTERA_PREFIX.length)
  }
  return name
}
