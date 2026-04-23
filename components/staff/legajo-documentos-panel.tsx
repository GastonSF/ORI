"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { FileText, CheckCircle2, XCircle, CircleDashed, AlertCircle, Loader2, ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon, FileIcon } from "lucide-react"
import { getStaffDocumentSignedUrlAction } from "@/lib/actions/staff-documents"
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

type DocItem = {
  docId: string
  label: string
  fileName: string
  status: "pending" | "uploaded" | "approved" | "rejected"
  section: "initial" | "additional"
  isRequired?: boolean
}

type PreviewState = {
  url: string
  mimeType: string | null
  fileName: string
}

export function LegajoDocumentosPanel({ documents, additionalRequests }: Props) {
  const flatList = useMemo<DocItem[]>(() => {
    const items: DocItem[] = []
    documents.filter((d) => d.doc_phase === "initial").forEach((d) => {
      items.push({
        docId: d.id,
        label: DOCUMENT_TYPE_LABELS[d.document_type as DocumentType] ?? d.document_type,
        fileName: d.file_name,
        status: d.status,
        section: "initial",
      })
    })
    additionalRequests.forEach((req) => {
      const doc = documents.find((d) => d.doc_phase === "additional" && d.id === req.fulfilled_by_document_id)
      if (doc) {
        const effectiveStatus = req.status === "approved" ? "approved" : req.status === "rejected" ? "rejected" : "uploaded"
        items.push({
          docId: doc.id,
          label: req.document_name,
          fileName: doc.file_name,
          status: effectiveStatus as DocItem["status"],
          section: "additional",
          isRequired: req.is_required,
        })
      }
    })
    return items
  }, [documents, additionalRequests])

  const pendingAddl = useMemo(() => additionalRequests.filter((r) => !r.fulfilled_by_document_id), [additionalRequests])

  const [selectedIdx, setSelectedIdx] = useState<number>(0)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = flatList[selectedIdx]

  useEffect(() => {
    if (!selected) {
      setPreview(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getStaffDocumentSignedUrlAction(selected.docId)
      .then((res) => {
        if (cancelled) return
        if (!res.ok || !res.data) {
          setError(res.ok ? "No pudimos abrir el archivo" : res.error)
          setPreview(null)
          return
        }
        setPreview({ url: res.data.url, mimeType: res.data.mime_type, fileName: res.data.file_name })
      })
      .catch(() => {
        if (!cancelled) {
          setError("Error abriendo el archivo")
          setPreview(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault()
        setSelectedIdx((idx) => Math.min(idx + 1, flatList.length - 1))
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault()
        setSelectedIdx((idx) => Math.max(idx - 1, 0))
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [flatList.length])

  if (flatList.length === 0 && pendingAddl.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No hay documentos cargados.</p>
      </section>
    )
  }

  const initialItems = flatList.filter((i) => i.section === "initial")
  const additionalItems = flatList.filter((i) => i.section === "additional")

  return (
    <section className="grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-4 lg:col-span-3">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documentos ({flatList.length})</p>
          </div>

          {initialItems.length > 0 ? (
            <>
              <SectionLabel>Iniciales ({initialItems.length})</SectionLabel>
              <ul className="divide-y divide-gray-100">
                {initialItems.map((item) => {
                  const idx = flatList.indexOf(item)
                  return <DocListItem key={item.docId} item={item} selected={idx === selectedIdx} onSelect={() => setSelectedIdx(idx)} />
                })}
              </ul>
            </>
          ) : null}

          {additionalItems.length > 0 ? (
            <>
              <SectionLabel>Adicionales ({additionalItems.length})</SectionLabel>
              <ul className="divide-y divide-gray-100">
                {additionalItems.map((item) => {
                  const idx = flatList.indexOf(item)
                  return <DocListItem key={item.docId} item={item} selected={idx === selectedIdx} onSelect={() => setSelectedIdx(idx)} />
                })}
              </ul>
            </>
          ) : null}

          {pendingAddl.length > 0 ? (
            <>
              <SectionLabel>Pendientes ({pendingAddl.length})</SectionLabel>
              <ul className="divide-y divide-gray-100">
                {pendingAddl.map((req) => (
                  <li key={req.id} className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <CircleDashed className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-600 truncate">{req.document_name}</p>
                        <p className="text-[10px] text-gray-400 italic">No subido todavía</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      <div className="col-span-12 md:col-span-8 lg:col-span-9">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col" style={{ minHeight: "600px" }}>
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button type="button" onClick={() => setSelectedIdx((i) => Math.max(i - 1, 0))} disabled={selectedIdx === 0} className="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors" title="Documento anterior"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setSelectedIdx((i) => Math.min(i + 1, flatList.length - 1))} disabled={selectedIdx === flatList.length - 1} className="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors" title="Documento siguiente"><ChevronRight className="h-4 w-4" /></button>
                  <div className="min-w-0 flex-1 ml-1">
                    <p className="text-xs font-medium text-gray-900 truncate">{selected.label}</p>
                    <p className="text-[11px] text-gray-500 truncate font-mono">{selected.fileName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-500">{selectedIdx + 1} / {flatList.length}</span>
                  {preview ? <a href={preview.url} target="_blank" rel="noopener noreferrer" title="Abrir en nueva pestaña" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a> : null}
                </div>
              </div>

              <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto">
                {loading ? (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-xs">Cargando documento...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center gap-2 text-red-600 px-6 text-center">
                    <AlertCircle className="h-6 w-6" />
                    <p className="text-xs">{error}</p>
                    <button type="button" onClick={() => { toast.dismiss(); setError(null); setSelectedIdx((i) => i) }} className="text-xs text-[#1b38e8] hover:underline">Reintentar</button>
                  </div>
                ) : preview ? (
                  <DocumentRenderer preview={preview} />
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <FileText className="h-10 w-10 mb-2" />
              <p className="text-sm">Seleccioná un documento para previsualizar</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-1.5 bg-gray-50 border-b border-t border-gray-100">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{children}</p>
    </div>
  )
}

function DocListItem({ item, selected, onSelect }: { item: DocItem; selected: boolean; onSelect: () => void }) {
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(item.fileName)
  const TypeIcon = isImage ? ImageIcon : FileIcon
  return (
    <li>
      <button type="button" onClick={onSelect} className={`w-full text-left px-3 py-2 transition-colors flex items-start gap-2 ${selected ? "bg-[#eff3ff] border-l-2 border-[#1b38e8]" : "hover:bg-gray-50 border-l-2 border-transparent"}`}>
        <div className="shrink-0 mt-0.5">{getStatusIcon(item.status)}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${selected ? "text-[#1b38e8]" : "text-gray-900"}`}>
            {item.label}
            {item.isRequired === false ? <span className="text-[9px] text-gray-400 ml-1">(opcional)</span> : null}
          </p>
          <p className="text-[10px] text-gray-500 truncate flex items-center gap-1 font-mono">
            <TypeIcon className="h-2.5 w-2.5 shrink-0" />
            {item.fileName}
          </p>
        </div>
      </button>
    </li>
  )
}

function DocumentRenderer({ preview }: { preview: PreviewState }) {
  const isImage = (preview.mimeType && preview.mimeType.startsWith("image/")) || /\.(jpe?g|png|webp|gif)$/i.test(preview.fileName)
  if (isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={preview.url} alt={preview.fileName} className="max-w-full max-h-full object-contain" />
  }
  return <iframe src={preview.url} className="w-full h-full bg-white" title={preview.fileName} />
}

function getStatusIcon(status: "pending" | "uploaded" | "approved" | "rejected") {
  if (status === "approved") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
  if (status === "rejected") return <XCircle className="h-3.5 w-3.5 text-red-600" />
  if (status === "uploaded") return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
  return <CircleDashed className="h-3.5 w-3.5 text-gray-300" />
}
