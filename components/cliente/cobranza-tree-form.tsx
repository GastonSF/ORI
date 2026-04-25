"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Loader2,
  AlertCircle,
  CreditCard,
  Wallet,
  HandCoins,
} from "lucide-react"
import {
  COLLECTION_CHANNELS,
  COLLECTION_CHANNEL_LABELS,
  COLLECTION_CHANNEL_DESCRIPTIONS,
  DEBITO_TIPOS,
  DEBITO_TIPO_LABELS,
  type CollectionChannel,
  type DebitoTipo,
  type CollectionCodeOwnership,
} from "@/lib/constants/roles"
import { saveCobranzaChannelsAction } from "@/lib/actions/cobranza-channels"
import { addCollectionCodeAction } from "@/lib/actions/collection-codes"
import { CollectionCodeCard } from "@/components/cliente/collection-code-card"

type CodeDoc = {
  id: string
  file_name: string
  file_size_bytes: number | null
}

type CodeWithDocs = {
  id: string
  code_name: string
  ownership: CollectionCodeOwnership
  cedente_nivel_1_name: string | null
  cedente_nivel_2_name: string | null
  is_excluded: boolean
  exclusion_reason: string | null
  autorizacion_descuento_doc_id: string | null
  convenio_nivel_1_doc_id: string | null
  convenio_nivel_2_doc_id: string | null
  autorizacion_mutual_original_doc_id: string | null
  docs: {
    autorizacion_descuento: CodeDoc | null
    convenio_nivel_1: CodeDoc | null
    convenio_nivel_2: CodeDoc | null
    autorizacion_mutual_original: CodeDoc | null
  }
}

type Props = {
  applicationId: string
  initialChannels: CollectionChannel[]
  initialDebitoTipos: DebitoTipo[]
  codes: CodeWithDocs[]
  readOnly?: boolean
}

const CHANNEL_ICONS: { [K in CollectionChannel]: typeof CreditCard } = {
  descuento_haberes: CreditCard,
  debito_cuenta: Wallet,
  pago_voluntario: HandCoins,
}

/**
 * Formulario completo del árbol de política de cobranza.
 *
 * Orquesta:
 *   1. Pregunta de canales (multiselect: 3 opciones)
 *   2. Sub-pregunta: tipos de débito (si marcó débito)
 *   3. Lista de códigos (si marcó descuento de haberes) con botón "agregar"
 *
 * Auto-guarda los canales y tipos al cambiar (sin botón "guardar").
 * Cada código tiene su propia card con su lógica.
 */
export function CobranzaTreeForm({
  applicationId,
  initialChannels,
  initialDebitoTipos,
  codes,
  readOnly = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Estado local de canales y débito (lo único editable a este nivel)
  const [channels, setChannels] = useState<CollectionChannel[]>(initialChannels)
  const [debitoTipos, setDebitoTipos] = useState<DebitoTipo[]>(initialDebitoTipos)

  const includesDescuento = channels.includes("descuento_haberes")
  const includesDebito = channels.includes("debito_cuenta")

  // ============================================================
  // Toggle handlers
  // ============================================================

  const toggleChannel = (channel: CollectionChannel) => {
    if (readOnly) return

    const newChannels = channels.includes(channel)
      ? channels.filter((c) => c !== channel)
      : [...channels, channel]

    setChannels(newChannels)

    // Si saco débito, limpio los tipos
    const newDebitoTipos = newChannels.includes("debito_cuenta") ? debitoTipos : []
    if (!newChannels.includes("debito_cuenta")) {
      setDebitoTipos([])
    }

    saveChannels(newChannels, newDebitoTipos)
  }

  const toggleDebitoTipo = (tipo: DebitoTipo) => {
    if (readOnly) return

    const newTipos = debitoTipos.includes(tipo)
      ? debitoTipos.filter((t) => t !== tipo)
      : [...debitoTipos, tipo]

    setDebitoTipos(newTipos)
    saveChannels(channels, newTipos)
  }

  const saveChannels = (
    newChannels: CollectionChannel[],
    newDebitoTipos: DebitoTipo[]
  ) => {
    setError(null)
    startTransition(async () => {
      const result = await saveCobranzaChannelsAction({
        application_id: applicationId,
        channels: newChannels,
        debito_tipos: newDebitoTipos,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  // ============================================================
  // Add code handler
  // ============================================================

  const handleAddCode = () => {
    setError(null)
    startTransition(async () => {
      const result = await addCollectionCodeAction({
        application_id: applicationId,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* ============================================================
          PASO 1: Canales
          ============================================================ */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-[#eff3ff] grid place-items-center shrink-0">
            <span className="text-sm font-semibold text-[#1b38e8]">1</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">
              ¿Qué canales de cobranza usás?
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Marcá todos los que correspondan. Podés combinarlos.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {COLLECTION_CHANNELS.map((channel) => {
            const Icon = CHANNEL_ICONS[channel]
            const isChecked = channels.includes(channel)
            return (
              <label
                key={channel}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isChecked
                    ? "border-[#1b38e8] bg-[#eff3ff]"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                } ${readOnly || pending ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleChannel(channel)}
                  disabled={readOnly || pending}
                  className="mt-1"
                />
                <Icon
                  className={`h-5 w-5 shrink-0 mt-0.5 ${
                    isChecked ? "text-[#1b38e8]" : "text-gray-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {COLLECTION_CHANNEL_LABELS[channel]}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    {COLLECTION_CHANNEL_DESCRIPTIONS[channel]}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* ============================================================
          PASO 2: Tipos de débito (si aplica)
          ============================================================ */}
      {includesDebito && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-[#eff3ff] grid place-items-center shrink-0">
              <span className="text-sm font-semibold text-[#1b38e8]">2</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">
                ¿De qué tipo de cuenta debitás?
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Marcá los tipos que usás (podés usar las dos).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEBITO_TIPOS.map((tipo) => {
              const isChecked = debitoTipos.includes(tipo)
              return (
                <label
                  key={tipo}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? "border-[#1b38e8] bg-[#eff3ff]"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  } ${readOnly || pending ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDebitoTipo(tipo)}
                    disabled={readOnly || pending}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {DEBITO_TIPO_LABELS[tipo]}
                  </span>
                </label>
              )
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          PASO 3: Códigos (si aplica)
          ============================================================ */}
      {includesDescuento && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-[#eff3ff] grid place-items-center shrink-0">
              <span className="text-sm font-semibold text-[#1b38e8]">
                {includesDebito ? "3" : "2"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">
                Tus códigos de descuento de haberes
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Cargá cada código que usás. Por cada uno te vamos a pedir su
                titularidad y la documentación que lo respalde.
              </p>
            </div>
          </div>

          {codes.length > 0 ? (
            <div className="space-y-3">
              {codes.map((code, idx) => (
                <CollectionCodeCard
                  key={code.id}
                  index={idx + 1}
                  code={code}
                  docs={code.docs}
                  readOnly={readOnly}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">
                Todavía no cargaste ningún código.
              </p>
              <p className="text-xs text-gray-500">
                Hacé clic abajo para empezar.
              </p>
            </div>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleAddCode}
              disabled={pending}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-[#1b38e8] hover:text-[#1b38e8] hover:bg-[#f7f9ff] transition-colors disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {codes.length === 0 ? "Agregar primer código" : "Agregar otro código"}
                </>
              )}
            </button>
          )}
        </section>
      )}

      {/* ============================================================
          MENSAJE FINAL si no eligió ningún canal
          ============================================================ */}
      {channels.length === 0 && !readOnly && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            <strong>Para empezar, marcá al menos un canal de cobranza.</strong>{" "}
            Si tenés varios, marcalos todos.
          </p>
        </div>
      )}

      {/* ============================================================
          MENSAJE si solo eligió pago voluntario (no necesita más)
          ============================================================ */}
      {channels.length > 0 &&
        !includesDescuento &&
        !includesDebito &&
        channels.includes("pago_voluntario") && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p>
              <strong>Listo.</strong> Como solo cobrás por pago voluntario, no
              necesitamos más información en esta sección. Volvé al pedido de
              información para completar las otras secciones.
            </p>
          </div>
        )}

      {/* Errores */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
