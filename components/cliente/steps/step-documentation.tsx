"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import type { Client } from "@/types/database.types"
import {
  REQUIRED_DOCS_BY_CLIENT_TYPE,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/constants/roles"
import { markOnboardingStepAction } from "@/lib/actions/client"
import { DocumentRow } from "@/components/cliente/document-row"

type ExistingDoc = {
  id: string
  document_type: string
  file_name: string
  file_size_bytes: number | null
  mime_type?: string | null
  status: string
} | null

type Props = {
  client: Client
  applicationId: string | null
  applicationNumber: string | null
  existingDocs: Record<string, ExistingDoc>
  onDone: () => void
}

export function StepDocumentation({
  client,
  applicationId,
  applicationNumber,
  existingDocs,
  onDone,
}: Props) {
  const [pending, startTransition] = useTransition()

  const requiredDocs = REQUIRED_DOCS_BY_CLIENT_TYPE[client.client_type]
  const completedCount = requiredDocs.filter((t) => existingDocs[t]).length

  const handleContinue = () => {
    startTransition(async () => {
      await markOnboardingStepAction(5)
      onDone()
    })
  }

  if (!applicationId) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Todavía no se creó tu legajo. Volvé al paso anterior y completá los datos.
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Documentación</h2>
      <p className="mt-1 text-sm text-gray-600">
        Subí los documentos requeridos para tu legajo. Máximo 25 MB por archivo.
      </p>

      {applicationNumber && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-blue-50/50 border border-blue-100 p-3 text-sm">
          <span className="text-gray-700">
            Legajo <span className="font-mono font-medium">{applicationNumber}</span>
          </span>
          <span className="text-[#1b38e8] font-medium">
            {completedCount} de {requiredDocs.length} completados
          </span>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {requiredDocs.map((type) => (
          <DocumentRow
            key={type}
            docType={type as DocumentType}
            label={DOCUMENT_TYPE_LABELS[type as DocumentType]}
            applicationId={applicationId}
            clientId={client.id}
            existingDoc={existingDocs[type] ?? null}
          />
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {completedCount === requiredDocs.length
            ? "¡Todos los documentos cargados! Podés avanzar."
            : "Podés volver y completar lo que falta más tarde."}
        </p>
        <button
          type="button"
          onMouseDown={(e) => {
            // Usamos onMouseDown para no perder el primer click si el
            // navegador está procesando un blur de otro elemento.
            e.preventDefault()
            if (!pending) handleContinue()
          }}
          onKeyDown={(e) => {
            // Accesibilidad: Enter y Space siguen funcionando.
            if ((e.key === "Enter" || e.key === " ") && !pending) {
              e.preventDefault()
              handleContinue()
            }
          }}
          disabled={pending}
          className="rounded-md bg-[#1b38e8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
            </span>
          ) : (
            "Siguiente"
          )}
        </button>
      </div>
    </div>
  )
}
