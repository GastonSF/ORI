"use client"

import { useState } from "react"
import { AlertCircle, ChevronRight, FileText } from "lucide-react"
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/constants/roles"
import { ClienteResubirDocModal } from "@/components/cliente/resubir-doc-modal"

type RejectedDoc = {
  id: string
  application_id: string
  application_number: string
  document_type: string
  file_name: string
  review_notes: string | null
  reviewed_at: string | null
}

type Props = {
  rejectedDocs: RejectedDoc[]
  clientId: string
}

/**
 * Banner rojo destacado cuando el cliente tiene docs rechazados que
 * todavía no re-subió. Se muestra en el dashboard y en /cliente/documentos.
 */
export function RejectedDocsBanner({ rejectedDocs, clientId }: Props) {
  const [selected, setSelected] = useState<RejectedDoc | null>(null)

  if (rejectedDocs.length === 0) return null

  return (
    <>
      <div className="rounded-xl border border-red-200 bg-red-50/80 overflow-hidden">
        {/* Header del banner */}
        <div className="px-5 py-3 border-b border-red-100 bg-red-100/50 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">
              {rejectedDocs.length === 1
                ? "Tenemos una observación sobre un documento que subiste"
                : `Tenemos observaciones sobre ${rejectedDocs.length} documentos que subiste`}
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Revisá el motivo y volvé a subirlos para que podamos continuar.
            </p>
          </div>
        </div>

        {/* Lista de docs rechazados */}
        <ul className="divide-y divide-red-100">
          {rejectedDocs.map((doc) => {
            const label =
              DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] ??
              doc.document_type
            return (
              <li key={doc.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-md bg-white border border-red-200 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-[11px] text-gray-500 font-mono truncate">
                        {doc.file_name}
                      </p>
                      {doc.review_notes ? (
                        <div className="mt-1.5 rounded-md border border-red-100 bg-white px-2.5 py-1.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-red-600 mb-0.5">
                            Motivo
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {doc.review_notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(doc)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1b38e8] text-white text-xs font-semibold hover:bg-[#1730c4] transition-colors"
                  >
                    Volver a subirlo
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {selected ? (
        <ClienteResubirDocModal
          open={!!selected}
          onClose={() => setSelected(null)}
          rejectedDoc={selected}
          clientId={clientId}
        />
      ) : null}
    </>
  )
}
