import {
  Coins,
  CreditCard,
  Wallet,
  HandCoins,
  CheckCircle2,
  EyeOff,
  CircleDashed,
  FileText,
  ExternalLink,
} from "lucide-react"
import {
  COLLECTION_CHANNEL_LABELS,
  DEBITO_TIPO_LABELS,
  COLLECTION_CODE_OWNERSHIP_LABELS,
  type CollectionChannel,
  type DebitoTipo,
  type CollectionCodeOwnership,
} from "@/lib/constants/roles"

type DocInfo = {
  id: string
  file_name: string
  file_size_bytes: number | null
  signed_url: string | null
}

type CodeData = {
  id: string
  code_name: string
  ownership: CollectionCodeOwnership
  cedente_nivel_1_name: string | null
  cedente_nivel_2_name: string | null
  is_excluded: boolean
  exclusion_reason: string | null
  docs: {
    autorizacion_descuento: DocInfo | null
    convenio_nivel_1: DocInfo | null
    convenio_nivel_2: DocInfo | null
    autorizacion_mutual_original: DocInfo | null
  }
}

type Props = {
  applicationNumber: string
  channels: CollectionChannel[]
  debitoTipos: DebitoTipo[]
  codes: CodeData[]
  /**
   * Si es null, el cliente todavía no envió el pedido.
   * Si tiene fecha, ya lo envió (panel está "cerrado" para el cliente).
   */
  completedAt: string | null
}

const CHANNEL_ICONS: { [K in CollectionChannel]: typeof CreditCard } = {
  descuento_haberes: CreditCard,
  debito_cuenta: Wallet,
  pago_voluntario: HandCoins,
}

/**
 * Panel read-only para el oficial: muestra el árbol de cobranza
 * que respondió el cliente.
 *
 * Renderiza:
 *   - Header con el badge de estado (en progreso / enviado)
 *   - Canales seleccionados con iconos
 *   - Tipos de débito (si aplica)
 *   - Lista de códigos con su titularidad, cedentes y archivos descargables
 *
 * Es server-friendly (no usa useState, useEffect, etc): solo render.
 * Los archivos se muestran con link al signed_url (descarga directa).
 */
export function LegajoCobranzaPanel({
  applicationNumber,
  channels,
  debitoTipos,
  codes,
  completedAt,
}: Props) {
  const includesDescuento = channels.includes("descuento_haberes")
  const includesDebito = channels.includes("debito_cuenta")
  const isSubmitted = !!completedAt

  // Si no hay canales y no hay códigos → cliente no completó nada
  const isEmpty = channels.length === 0 && codes.length === 0

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#eff3ff] grid place-items-center shrink-0">
            <Coins className="h-5 w-5 text-[#1b38e8]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Política de cobranza
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Lo que respondió el cliente sobre cómo cobra sus créditos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Enviado por el cliente
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <CircleDashed className="h-3 w-3" />
              En progreso (cliente todavía cargando)
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Empty state */}
        {isEmpty && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              El cliente aún no cargó información sobre su política de cobranza.
            </p>
          </div>
        )}

        {/* Sección 1: Canales */}
        {!isEmpty && (
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Canales de cobranza
            </h3>
            {channels.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Sin canales seleccionados</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {channels.map((ch) => {
                  const Icon = CHANNEL_ICONS[ch]
                  return (
                    <span
                      key={ch}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#eff3ff] text-[#1b38e8] border border-blue-200 text-sm font-medium"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {COLLECTION_CHANNEL_LABELS[ch]}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Sección 2: Tipos de débito (si aplica) */}
        {includesDebito && (
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Tipos de cuenta para débito
            </h3>
            {debitoTipos.length === 0 ? (
              <p className="text-sm text-amber-700 italic flex items-center gap-1.5">
                <CircleDashed className="h-3.5 w-3.5" />
                El cliente marcó débito en cuenta pero no especificó el tipo
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {debitoTipos.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200 text-sm"
                  >
                    {DEBITO_TIPO_LABELS[t]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sección 3: Códigos (si aplica) */}
        {includesDescuento && (
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Códigos de descuento de haberes
              </h3>
              {codes.length > 0 && (
                <span className="text-[11px] text-gray-500">
                  {codes.length} código{codes.length !== 1 ? "s" : ""} cargado
                  {codes.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {codes.length === 0 ? (
              <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                El cliente marcó descuento de haberes pero todavía no agregó
                ningún código.
              </div>
            ) : (
              <div className="space-y-3">
                {codes.map((c, idx) => (
                  <CollectionCodeRow key={c.id} index={idx + 1} code={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================================
// Subcomponente: una fila de código (read-only)
// ============================================================

function CollectionCodeRow({ index, code }: { index: number; code: CodeData }) {
  const isComplete = !code.is_excluded && checkComplete(code)

  return (
    <div
      className={`rounded-lg border p-4 ${
        code.is_excluded
          ? "border-gray-200 bg-gray-50"
          : isComplete
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-amber-200 bg-amber-50/40"
      }`}
    >
      {/* Header de la fila */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {code.is_excluded ? (
            <EyeOff className="h-4 w-4 text-gray-500 shrink-0" />
          ) : isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <CircleDashed className="h-4 w-4 text-amber-600 shrink-0" />
          )}
          <h4 className="text-sm font-semibold text-gray-900">
            #{index} ·{" "}
            <span className={code.code_name?.trim() ? "" : "italic text-gray-500"}>
              {code.code_name?.trim() || "Sin nombre"}
            </span>
          </h4>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
              code.is_excluded
                ? "bg-gray-100 text-gray-600 border border-gray-200"
                : isComplete
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {code.is_excluded ? "Excluido" : isComplete ? "Completo" : "Incompleto"}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-gray-700 border border-gray-200">
            {COLLECTION_CODE_OWNERSHIP_LABELS[code.ownership]}
          </span>
        </div>
      </div>

      {/* Si está excluido, mostrar la razón y nada más */}
      {code.is_excluded ? (
        <div className="text-xs text-gray-700 bg-white rounded-md border border-gray-200 p-3">
          <p className="font-medium text-gray-600 mb-1">
            Razón por la que el cliente lo excluyó:
          </p>
          <p className="italic">
            {code.exclusion_reason || "(sin razón especificada)"}
          </p>
        </div>
      ) : (
        <>
          {/* Cadena de cesión (si aplica) */}
          {code.ownership !== "propio" && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide font-semibold mb-1">
                Cadena de cesión
              </p>
              <div className="text-sm text-gray-800 bg-white rounded-md border border-gray-200 p-2.5">
                {code.ownership === "tercero_directo" && (
                  <span>
                    <span className="font-medium">{code.cedente_nivel_1_name || "(sin nombre)"}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-gray-600">cliente</span>
                  </span>
                )}
                {code.ownership === "tercero_sub_cedido" && (
                  <span>
                    <span className="font-medium">{code.cedente_nivel_2_name || "(sin nombre)"}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="font-medium">{code.cedente_nivel_1_name || "(sin nombre)"}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-gray-600">cliente</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Documentos del código */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wide font-semibold mb-2">
              Documentación
            </p>
            <div className="space-y-1.5">
              <DocSlotRow
                label="Autorización del ente que descuenta"
                doc={code.docs.autorizacion_descuento}
              />
              {(code.ownership === "tercero_directo" ||
                code.ownership === "tercero_sub_cedido") && (
                <DocSlotRow
                  label={`Convenio con ${code.cedente_nivel_1_name || "la entidad cedente"}`}
                  doc={code.docs.convenio_nivel_1}
                />
              )}
              {code.ownership === "tercero_sub_cedido" && (
                <>
                  <DocSlotRow
                    label={`Convenio entre ${
                      code.cedente_nivel_2_name || "entidad original"
                    } y ${code.cedente_nivel_1_name || "entidad cedente"}`}
                    doc={code.docs.convenio_nivel_2}
                  />
                  <DocSlotRow
                    label={`Autorización de ${
                      code.cedente_nivel_2_name || "la entidad original"
                    }`}
                    doc={code.docs.autorizacion_mutual_original}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// Subcomponente: una fila de documento descargable
// ============================================================

function DocSlotRow({
  label,
  doc,
}: {
  label: string
  doc: DocInfo | null
}) {
  if (!doc) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-white rounded border border-gray-200 px-2.5 py-1.5">
        <CircleDashed className="h-3 w-3 shrink-0" />
        <span className="flex-1 min-w-0 truncate">{label}</span>
        <span className="text-[10px] italic">Sin subir</span>
      </div>
    )
  }

  const sizeMb =
    doc.file_size_bytes != null
      ? (doc.file_size_bytes / (1024 * 1024)).toFixed(2)
      : null

  return (
    <div className="flex items-center gap-2 text-xs bg-white rounded border border-gray-200 px-2.5 py-1.5">
      <FileText className="h-3 w-3 shrink-0 text-[#1b38e8]" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 font-medium truncate">{label}</p>
        <p className="text-[10px] text-gray-500 truncate font-mono">
          {doc.file_name}
          {sizeMb && <span className="ml-1">· {sizeMb} MB</span>}
        </p>
      </div>
      {doc.signed_url ? (
        
          href={doc.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1b38e8] text-white text-[10px] font-semibold hover:bg-[#1730c4] shrink-0"
        >
          <ExternalLink className="h-3 w-3" />
          Ver
        </a>
      ) : (
        <span className="text-[10px] text-gray-400 italic shrink-0">
          (sin link)
        </span>
      )}
    </div>
  )
}

// ============================================================
// Helper: ¿está completo?
// ============================================================
function checkComplete(c: CodeData): boolean {
  if (c.is_excluded) return true
  if (!c.code_name?.trim()) return false

  switch (c.ownership) {
    case "propio":
      return !!c.docs.autorizacion_descuento
    case "tercero_directo":
      return (
        !!c.cedente_nivel_1_name?.trim() &&
        !!c.docs.convenio_nivel_1 &&
        !!c.docs.autorizacion_descuento
      )
    case "tercero_sub_cedido":
      return (
        !!c.cedente_nivel_1_name?.trim() &&
        !!c.cedente_nivel_2_name?.trim() &&
        !!c.docs.convenio_nivel_1 &&
        !!c.docs.autorizacion_descuento &&
        !!c.docs.convenio_nivel_2 &&
        !!c.docs.autorizacion_mutual_original
      )
    default:
      return false
  }
}
