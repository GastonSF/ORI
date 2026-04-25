"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Trash2,
  Loader2,
  AlertCircle,
  EyeOff,
  Eye,
  Save,
  CheckCircle2,
  CircleDashed,
} from "lucide-react"
import {
  COLLECTION_CODE_OWNERSHIPS,
  COLLECTION_CODE_OWNERSHIP_LABELS,
  COLLECTION_CODE_OWNERSHIP_DESCRIPTIONS,
  type CollectionCodeOwnership,
} from "@/lib/constants/roles"
import {
  updateCollectionCodeAction,
  setCollectionCodeExclusionAction,
  deleteCollectionCodeAction,
} from "@/lib/actions/collection-codes"
import { CodeDocUpload } from "@/components/cliente/code-doc-upload"

type CodeDoc = {
  id: string
  file_name: string
  file_size_bytes: number | null
}

type Props = {
  index: number // posición en la lista (1, 2, 3...) para mostrar "Código N"
  code: {
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
  }
  // Documentos asociados a los slots (precargados)
  docs: {
    autorizacion_descuento: CodeDoc | null
    convenio_nivel_1: CodeDoc | null
    convenio_nivel_2: CodeDoc | null
    autorizacion_mutual_original: CodeDoc | null
  }
  readOnly?: boolean
}

/**
 * Card de un código de descuento de haberes.
 *
 * Es la pieza más visual del árbol: muestra el formulario dinámico que
 * cambia según el ownership elegido. Cada radio button revela los slots
 * de upload + nombres de cedentes que correspondan.
 *
 * Modos:
 *   - Editable (additional_docs_pending): cliente puede modificar todo
 *   - ReadOnly (additional_docs_review): solo se muestra en consulta
 *
 * Estado local con auto-save:
 *   - Nombre del código y nombres de cedentes: se guardan al salir del input (onBlur)
 *   - Ownership: se guarda al cambiar el radio
 *   - Exclusión: modal con razón
 *   - Eliminar: confirm nativo
 */
export function CollectionCodeCard({
  index,
  code,
  docs,
  readOnly = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Estado local sincronizado con props
  const [codeName, setCodeName] = useState(code.code_name)
  const [ownership, setOwnership] = useState<CollectionCodeOwnership>(code.ownership)
  const [cedente1, setCedente1] = useState(code.cedente_nivel_1_name ?? "")
  const [cedente2, setCedente2] = useState(code.cedente_nivel_2_name ?? "")

  // Modal de exclusión
  const [excludeModalOpen, setExcludeModalOpen] = useState(false)
  const [exclusionReason, setExclusionReason] = useState(
    code.exclusion_reason ?? ""
  )

  // Resync si cambia la prop (después de router.refresh)
  useEffect(() => {
    setCodeName(code.code_name)
    setOwnership(code.ownership)
    setCedente1(code.cedente_nivel_1_name ?? "")
    setCedente2(code.cedente_nivel_2_name ?? "")
    setExclusionReason(code.exclusion_reason ?? "")
  }, [code])

  const isExcluded = code.is_excluded

  // ============================================================
  // Save handlers
  // ============================================================

  const saveField = (
    field: "code_name" | "ownership" | "cedente_nivel_1_name" | "cedente_nivel_2_name",
    value: string | CollectionCodeOwnership | null
  ) => {
    setSaveError(null)
    startTransition(async () => {
      const result = await updateCollectionCodeAction({
        code_id: code.id,
        ...(field === "code_name" && { code_name: value as string }),
        ...(field === "ownership" && { ownership: value as CollectionCodeOwnership }),
        ...(field === "cedente_nivel_1_name" && {
          cedente_nivel_1_name: value as string | null,
        }),
        ...(field === "cedente_nivel_2_name" && {
          cedente_nivel_2_name: value as string | null,
        }),
      })
      if (!result.ok) {
        setSaveError(result.error)
        return
      }
      router.refresh()
    })
  }

  const handleNameBlur = () => {
    if (codeName.trim() !== code.code_name) {
      saveField("code_name", codeName.trim())
    }
  }

  const handleOwnershipChange = (newOwnership: CollectionCodeOwnership) => {
    setOwnership(newOwnership)
    saveField("ownership", newOwnership)
  }

  const handleCedente1Blur = () => {
    const trimmed = cedente1.trim()
    if (trimmed !== (code.cedente_nivel_1_name ?? "")) {
      saveField("cedente_nivel_1_name", trimmed || null)
    }
  }

  const handleCedente2Blur = () => {
    const trimmed = cedente2.trim()
    if (trimmed !== (code.cedente_nivel_2_name ?? "")) {
      saveField("cedente_nivel_2_name", trimmed || null)
    }
  }

  // ============================================================
  // Exclusion handlers
  // ============================================================

  const handleConfirmExclusion = () => {
    if (exclusionReason.trim().length < 5) {
      setSaveError("Contanos por qué no podés conseguir la documentación (mínimo 5 caracteres)")
      return
    }
    setSaveError(null)
    startTransition(async () => {
      const result = await setCollectionCodeExclusionAction({
        code_id: code.id,
        is_excluded: true,
        exclusion_reason: exclusionReason.trim(),
      })
      if (!result.ok) {
        setSaveError(result.error)
        return
      }
      setExcludeModalOpen(false)
      router.refresh()
    })
  }

  const handleUndoExclusion = () => {
    if (!confirm("¿Volver a incluir este código en el análisis?")) return
    startTransition(async () => {
      const result = await setCollectionCodeExclusionAction({
        code_id: code.id,
        is_excluded: false,
      })
      if (!result.ok) {
        setSaveError(result.error)
        return
      }
      router.refresh()
    })
  }

  // ============================================================
  // Delete handler
  // ============================================================

  const handleDelete = () => {
    if (
      !confirm(
        "¿Eliminar este código? Se borran también los archivos que subiste."
      )
    )
      return
    startTransition(async () => {
      const result = await deleteCollectionCodeAction({ code_id: code.id })
      if (!result.ok) {
        setSaveError(result.error)
        return
      }
      router.refresh()
    })
  }

  // ============================================================
  // Cálculo de completitud
  // ============================================================
  const isComplete = checkCompleteness(code, docs)

  // ============================================================
  // Render
  // ============================================================

  return (
    <>
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isExcluded
            ? "border-gray-200 bg-gray-50"
            : isComplete
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-gray-200 bg-white"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isExcluded ? (
              <EyeOff className="h-4 w-4 text-gray-400 shrink-0" />
            ) : isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <CircleDashed className="h-4 w-4 text-gray-400 shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-gray-900">
              Código {index}
              {isExcluded && (
                <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  Excluido del análisis
                </span>
              )}
            </h3>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 shrink-0">
              {isExcluded ? (
                <button
                  type="button"
                  onClick={handleUndoExclusion}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-white disabled:opacity-50"
                  title="Volver a incluir"
                >
                  <Eye className="h-3 w-3" />
                  Incluir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setExcludeModalOpen(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="No tengo esta documentación"
                >
                  <EyeOff className="h-3 w-3" />
                  No tengo
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
                title="Eliminar código"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Si está excluido, mostrar la razón en grande y nada más */}
        {isExcluded ? (
          <div className="text-sm text-gray-600 italic bg-white rounded-md border border-gray-200 p-3">
            <p className="font-medium text-gray-700 mb-1">Por qué quedó fuera del análisis:</p>
            <p>{code.exclusion_reason}</p>
          </div>
        ) : (
          <>
            {/* Campo: nombre del código */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Nombre o identificador del código
              </label>
              <input
                type="text"
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                onBlur={handleNameBlur}
                disabled={readOnly || pending}
                placeholder="Ej: ANSES-001, POLICIA-PROV..."
                maxLength={100}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b38e8] focus:border-transparent disabled:opacity-60 disabled:bg-gray-50"
              />
            </div>

            {/* Campo: ownership (radio buttons) */}
            <div className="mb-4">
              <p className="block text-[11px] font-medium text-gray-700 mb-2">
                ¿De quién es este código?
              </p>
              <div className="space-y-2">
                {COLLECTION_CODE_OWNERSHIPS.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                      ownership === opt
                        ? "border-[#1b38e8] bg-[#eff3ff]"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    } ${readOnly || pending ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`ownership-${code.id}`}
                      value={opt}
                      checked={ownership === opt}
                      onChange={() => handleOwnershipChange(opt)}
                      disabled={readOnly || pending}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">
                        {COLLECTION_CODE_OWNERSHIP_LABELS[opt]}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                        {COLLECTION_CODE_OWNERSHIP_DESCRIPTIONS[opt]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Slots dinámicos según ownership */}
            <div className="space-y-2.5">
              {ownership === "propio" && (
                <>
                  <p className="text-[11px] font-medium text-gray-700">
                    Documentación requerida
                  </p>
                  <CodeDocUpload
                    codeId={code.id}
                    slot="autorizacion_descuento"
                    label="Autorización del ente que descuenta"
                    helperText="El permiso que te dio el organismo (ANSES, provincia, etc) para hacer el descuento de haberes."
                    existingDoc={docs.autorizacion_descuento}
                    readOnly={readOnly}
                  />
                </>
              )}

              {ownership === "tercero_directo" && (
                <>
                  <p className="text-[11px] font-medium text-gray-700">
                    La entidad que te cede el código
                  </p>
                  <input
                    type="text"
                    value={cedente1}
                    onChange={(e) => setCedente1(e.target.value)}
                    onBlur={handleCedente1Blur}
                    disabled={readOnly || pending}
                    placeholder="Nombre de la entidad (ej: Mutual del Policía)"
                    maxLength={100}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b38e8] focus:border-transparent disabled:opacity-60 disabled:bg-gray-50"
                  />

                  <p className="text-[11px] font-medium text-gray-700 pt-2">
                    Documentación requerida
                  </p>
                  <CodeDocUpload
                    codeId={code.id}
                    slot="convenio_nivel_1"
                    label="Convenio con la entidad cedente"
                    helperText="El acuerdo firmado con la entidad que te presta el código."
                    existingDoc={docs.convenio_nivel_1}
                    readOnly={readOnly}
                  />
                  <CodeDocUpload
                    codeId={code.id}
                    slot="autorizacion_descuento"
                    label="Autorización del ente que descuenta"
                    helperText="El permiso del organismo (ANSES, provincia, etc) que efectivamente realiza el descuento."
                    existingDoc={docs.autorizacion_descuento}
                    readOnly={readOnly}
                  />
                </>
              )}

              {ownership === "tercero_sub_cedido" && (
                <>
                  <p className="text-[11px] font-medium text-gray-700">
                    La cadena de cesión
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-1">
                        Entidad que te cede el código (te lo presta directamente)
                      </label>
                      <input
                        type="text"
                        value={cedente1}
                        onChange={(e) => setCedente1(e.target.value)}
                        onBlur={handleCedente1Blur}
                        disabled={readOnly || pending}
                        placeholder="Ej: Mutual ABC"
                        maxLength={100}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b38e8] focus:border-transparent disabled:opacity-60 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-1">
                        Entidad dueña original del código (le cedió a la anterior)
                      </label>
                      <input
                        type="text"
                        value={cedente2}
                        onChange={(e) => setCedente2(e.target.value)}
                        onBlur={handleCedente2Blur}
                        disabled={readOnly || pending}
                        placeholder="Ej: Mutual XYZ"
                        maxLength={100}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b38e8] focus:border-transparent disabled:opacity-60 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-gray-700 pt-2">
                    Documentación requerida (4 archivos)
                  </p>
                  <CodeDocUpload
                    codeId={code.id}
                    slot="convenio_nivel_1"
                    label={`Convenio con ${cedente1 || "la entidad cedente"}`}
                    helperText="Acuerdo firmado con quien te presta el código."
                    existingDoc={docs.convenio_nivel_1}
                    readOnly={readOnly}
                  />
                  <CodeDocUpload
                    codeId={code.id}
                    slot="autorizacion_descuento"
                    label="Autorización del ente que descuenta"
                    helperText="Permiso del organismo (ANSES, provincia, etc) que efectivamente realiza el descuento."
                    existingDoc={docs.autorizacion_descuento}
                    readOnly={readOnly}
                  />
                  <CodeDocUpload
                    codeId={code.id}
                    slot="convenio_nivel_2"
                    label={`Convenio entre ${cedente2 || "la entidad original"} y ${cedente1 || "la entidad cedente"}`}
                    helperText="El acuerdo original entre ambas entidades."
                    existingDoc={docs.convenio_nivel_2}
                    readOnly={readOnly}
                  />
                  <CodeDocUpload
                    codeId={code.id}
                    slot="autorizacion_mutual_original"
                    label={`Autorización de ${cedente2 || "la entidad original"}`}
                    helperText="La autorización que tiene la entidad dueña original del código."
                    existingDoc={docs.autorizacion_mutual_original}
                    readOnly={readOnly}
                  />
                </>
              )}
            </div>
          </>
        )}

        {/* Errores */}
        {saveError && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 rounded-md p-2 border border-red-100 flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Indicador de guardado */}
        {pending && (
          <p className="mt-2 text-[10px] text-gray-500 italic flex items-center gap-1">
            <Save className="h-3 w-3" />
            Guardando...
          </p>
        )}
      </div>

      {/* Modal de exclusión */}
      {excludeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !pending && setExcludeModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">
                Excluir código del análisis
              </h2>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                Si no podés conseguir la documentación de este código,
                podés dejarlo afuera del análisis. La línea de cartera
                asociada a este código <strong>no será considerada</strong>{" "}
                por WORCAP.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Contanos por qué (mínimo 5 caracteres)
                </label>
                <textarea
                  value={exclusionReason}
                  onChange={(e) => setExclusionReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={pending}
                  placeholder="Ej: La mutual cedente se disolvió y no podemos recuperar el convenio."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b38e8] focus:border-transparent disabled:opacity-60"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  {exclusionReason.length}/500
                </p>
              </div>

              {saveError && (
                <p className="text-xs text-red-700 bg-red-50 rounded-md p-2 border border-red-100">
                  {saveError}
                </p>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => !pending && setExcludeModalOpen(false)}
                disabled={pending}
                className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExclusion}
                disabled={pending || exclusionReason.trim().length < 5}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Excluir del análisis"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// Helper: ¿el código está completo?
// ============================================================
function checkCompleteness(
  code: Props["code"],
  docs: Props["docs"]
): boolean {
  if (code.is_excluded) return true // excluido = completo (a propósito)
  if (!code.code_name.trim()) return false

  switch (code.ownership) {
    case "propio":
      return !!docs.autorizacion_descuento
    case "tercero_directo":
      return (
        !!code.cedente_nivel_1_name?.trim() &&
        !!docs.convenio_nivel_1 &&
        !!docs.autorizacion_descuento
      )
    case "tercero_sub_cedido":
      return (
        !!code.cedente_nivel_1_name?.trim() &&
        !!code.cedente_nivel_2_name?.trim() &&
        !!docs.convenio_nivel_1 &&
        !!docs.autorizacion_descuento &&
        !!docs.convenio_nivel_2 &&
        !!docs.autorizacion_mutual_original
      )
  }
}
