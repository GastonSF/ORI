"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  CircleDashed,
  AlertCircle,
  Loader2,
  X,
  Download,
} from "lucide-react"
import { getAdditionalDocumentSignedUrlAction } from "@/lib/actions/additional-documents"
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/constants/roles"

type Doc = {
  id: string
  file_name: string
  file_size_bytes: number | null
  document_type: string
  doc_phase: "initial" | "additional"
  status: "pending" | "uploaded" | "approved" | "rejected"
  uploaded_at: string | null
}

type AddlReq = {
  id: string
  document_name: string
  description: string | null
  is_required: boolean
  status: string
  fulfilled_by_document_id: string | null
}

type Props = {
  documents: Doc[]
  additionalRequests: AddlReq[]
}

export function LegajoDocumentosPanel({ documents, additionalRequests }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null)

  const initialDocs = documents.filter((d) => d.doc_phase === "initial")
  const additionalDocs = documents.filter((d) => d.doc_phase === "additional")

  const additionalWithMeta = additionalRequests.map((req) => {
    const doc = additionalDocs.find((d) => d.id === req.fulfilled_by_document_id)
    return { req, doc }
  })

  const handleView = async (docId: string, fileName: string) => {
    setLoadingDocId(docId)
    try {
      const res = await getAdditionalDocumentSignedUrlAction(docId)
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "No pudimos abrir el archivo" : res.error)
        return
      }
      setPreviewUrl(res.data.url)
      setPreviewName(fileName)
    } catch {
      toast.error("Error abriendo el archivo")
    } finally {
      setLoadingDocId(null)
    }
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewName(null)
  }

  return (
    <>
      <aside className="rounded-xl border border-gray-200 bg-white overflow-hidden sticky top-20">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Documentos
          </h2>
        </div>

        {initialDocs.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Iniciales ({initialDocs.length})
              </p>
            </div>
            <ul className="divide-y divide-gray-100">
              {initialDocs.map((d) => (
                <DocRow
                  key={d.id}
                  id={d.id}
                  label={
                    DOCUMENT_TYPE_LABELS[d.document_type as DocumentType] ??
                    d.document_type
                  }
                  fileName={d.file_name}
                  status={d.status}
                  onView={() => handleView(d.id, d.file_name)}
                  loading={loadingDocId === d.id}
                />
              ))}
            </ul>
          </div>
        )}

        {additionalRequests.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gray-50 border-b border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Adicionales ({additionalRequests.length})
              </p>
            </div>
            <ul className="divide-y divide-gray-100">
              {additionalWithMeta.map(({ req, doc }) => (
                <AddlDocRow
                  key={req.id}
                  name={req.document_name}
                  isRequired={req.is_required}
                  reqStatus={req.status}
                  doc={doc}
                  onView={
                    doc ? () => handleView(doc.id, doc.file_name) : undefined
                  }
                  loading={doc ? loadingDocId === doc.id : false}
                />
              ))}
            </ul>
          </div>
        )}

        {initialDocs.length === 0 && additionalRequests.length === 0 && (
          <div className="p-6 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              No hay documentos cargados.
            </p>
          </div>
        )}
      </aside>

      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate pr-3">
                {previewName}
              </p>
              <div className="flex items-center gap-1">
                
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir en nueva pestaña"
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={closePreview}
                  title="Cerrar"
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-50">
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title={previewName ?? "Documento"}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function DocRow({
  label,
  fileName,
  status,
  onView,
  loading,
}: {
  id: string
  label: string
  fileName: string
  status: "pending" | "uploaded" | "approved" | "rejected"
  onView: () => void
  loading: boolean
}) {
  const icon = getStatusIcon(status)
  return (
    <li className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{label}</p>
          <p className="text-[11px] text-gray-500 truncate font-mono">
            {fileName}
          </p>
          <button
            type="button"
            onClick={onView}
            disabled={loading || status === "pending"}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#1b38e8] hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            Ver
          </button>
        </div>
      </div>
    </li>
  )
}

function AddlDocRow({
  name,
  isRequired,
  reqStatus,
  doc,
  onView,
  loading,
}: {
  name: string
  isRequired: boolean
  reqStatus: string
  doc: Doc | undefined
  onView?: () => void
  loading: boolean
}) {
  const effectiveStatus: "pending" | "uploaded" | "approved" | "rejected" =
    reqStatus === "approved"
      ? "approved"
      : reqStatus === "rejected"
      ? "rejected"
      : doc
      ? "uploaded"
      : "pending"

  return (
    <li className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5">{getStatusIcon(effectiveStatus)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-gray-900 truncate">{name}</p>
            {!isRequired && (
              <span className="text-[9px] text-gray-500">(opcional)</span>
            )}
          </div>
          {doc ? (
            <>
              <p className="text-[11px] text-gray-500 truncate font-mono">
                {doc.file_name}
              </p>
              <button
                type="button"
                onClick={onView}
                disabled={loading}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#1b38e8] hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                Ver
              </button>
            </>
          ) : (
            <p className="mt-0.5 text-[11px] text-gray-400 italic">
              No subido todavía
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

function getStatusIcon(
  status: "pending" | "uploaded" | "approved" | "rejected"
): React.ReactNode {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-600" />
    case "uploaded":
      return <AlertCircle className="h-4 w-4 text-amber-500" />
    case "pending":
    default:
      return <CircleDashed className="h-4 w-4 text-gray-300" />
  }
}
