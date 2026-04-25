import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, Coins, Lightbulb } from "lucide-react"
import {
  type CollectionChannel,
  type DebitoTipo,
  type CollectionCodeOwnership,
  type FundingLine,
} from "@/lib/constants/roles"
import { CobranzaTreeForm } from "@/components/cliente/cobranza-tree-form"

/**
 * Subpágina del pedido de información: política de cobranza (árbol).
 *
 * Carga:
 *   - Canales y tipos de débito desde funding_line_responses
 *   - Códigos desde collection_codes
 *   - Documentos asociados a cada slot de cada código
 *
 * Renderiza el CobranzaTreeForm que maneja todo el flujo dinámico.
 */
export default async function PoliticaCobranzaPage() {
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

  // Cargar la fila de funding_line_responses
  const { data: tree } = await supabase
    .from("funding_line_responses")
    .select("id, channels, debito_tipos")
    .eq("application_id", app.id)
    .maybeSingle()

  // Defensa: si por algún motivo no existe, mostrar mensaje
  if (!tree) {
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
            No encontramos el árbol de cobranza para tu legajo. Contactanos.
          </p>
        </div>
      </div>
    )
  }

  // Cargar los códigos
  const { data: rawCodes } = await supabase
    .from("collection_codes")
    .select(
      `
        id,
        code_name,
        ownership,
        cedente_nivel_1_name,
        cedente_nivel_2_name,
        is_excluded,
        exclusion_reason,
        autorizacion_descuento_doc_id,
        convenio_nivel_1_doc_id,
        convenio_nivel_2_doc_id,
        autorizacion_mutual_original_doc_id,
        created_at
      `
    )
    .eq("application_id", app.id)
    .order("created_at", { ascending: true })

  const codes = rawCodes ?? []

  // Recolectar todos los doc_ids asociados a los códigos para hacer una sola query
  const allDocIds: string[] = []
  for (const c of codes) {
    if (c.autorizacion_descuento_doc_id) allDocIds.push(c.autorizacion_descuento_doc_id)
    if (c.convenio_nivel_1_doc_id) allDocIds.push(c.convenio_nivel_1_doc_id)
    if (c.convenio_nivel_2_doc_id) allDocIds.push(c.convenio_nivel_2_doc_id)
    if (c.autorizacion_mutual_original_doc_id) allDocIds.push(c.autorizacion_mutual_original_doc_id)
  }

  type DocInfo = { id: string; file_name: string; file_size_bytes: number | null }
  const docsById = new Map<string, DocInfo>()

  if (allDocIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_name, file_size_bytes")
      .in("id", allDocIds)

    for (const d of docs ?? []) {
      docsById.set(d.id, {
        id: d.id,
        file_name: d.file_name,
        file_size_bytes: d.file_size_bytes,
      })
    }
  }

  // Armar la estructura final con docs incrustados
  const codesWithDocs = codes.map((c) => ({
    id: c.id,
    code_name: c.code_name,
    ownership: c.ownership as CollectionCodeOwnership,
    cedente_nivel_1_name: c.cedente_nivel_1_name,
    cedente_nivel_2_name: c.cedente_nivel_2_name,
    is_excluded: c.is_excluded,
    exclusion_reason: c.exclusion_reason,
    autorizacion_descuento_doc_id: c.autorizacion_descuento_doc_id,
    convenio_nivel_1_doc_id: c.convenio_nivel_1_doc_id,
    convenio_nivel_2_doc_id: c.convenio_nivel_2_doc_id,
    autorizacion_mutual_original_doc_id: c.autorizacion_mutual_original_doc_id,
    docs: {
      autorizacion_descuento: c.autorizacion_descuento_doc_id
        ? docsById.get(c.autorizacion_descuento_doc_id) ?? null
        : null,
      convenio_nivel_1: c.convenio_nivel_1_doc_id
        ? docsById.get(c.convenio_nivel_1_doc_id) ?? null
        : null,
      convenio_nivel_2: c.convenio_nivel_2_doc_id
        ? docsById.get(c.convenio_nivel_2_doc_id) ?? null
        : null,
      autorizacion_mutual_original: c.autorizacion_mutual_original_doc_id
        ? docsById.get(c.autorizacion_mutual_original_doc_id) ?? null
        : null,
    },
  }))

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
            <Coins className="h-6 w-6 text-[#1b38e8]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs font-semibold text-gray-600">
              {app.application_number}
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold text-gray-900">
              Política de cobranza
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Contanos cómo cobrás. Te vamos a hacer algunas preguntas para
              entender los canales que usás y, si tenés códigos de descuento de
              haberes, qué documentación los respalda.
            </p>
          </div>
        </div>
      </header>

      {/* Aviso si está en read-only */}
      {isReadOnly && (
        <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          Ya enviaste el pedido de información. Estás viendo lo que cargaste.
        </div>
      )}

      {/* Tip explicativo (solo si está vacío todo y no es read-only) */}
      {!isReadOnly && tree.channels.length === 0 && codesWithDocs.length === 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm text-amber-900">
              <p className="font-semibold">¿Por qué te preguntamos esto?</p>
              <p className="mt-1 text-amber-800 leading-relaxed">
                Tu política de cobranza nos permite entender el riesgo real de
                tu cartera. Por ejemplo, los códigos de descuento de haberes
                tienen mucho menor mora que el pago voluntario. La cadena de
                cesión de cada código nos ayuda a verificar que tenés derecho
                a usarlo.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* El formulario */}
      <CobranzaTreeForm
        applicationId={app.id}
        initialChannels={(tree.channels ?? []) as CollectionChannel[]}
        initialDebitoTipos={(tree.debito_tipos ?? []) as DebitoTipo[]}
        codes={codesWithDocs}
        readOnly={isReadOnly}
      />
    </div>
  )
}
