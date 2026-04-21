"use client"

import { useState } from "react"
import { Download, ExternalLink, Loader2, X, FileText, AlertCircle } from "lucide-react"
import { getDocumentSignedUrlAction } from "@/lib/actions/documents"

type Props = {
  documentId: string
  fileName: string
  mimeType?: string | null
  children: React.ReactNode
  triggerClassName?: string
}

export function DocumentPreviewModal({
  documentId,
  fileName,
  mimeType,
  children,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const category = getCategory(fileName, mimeType)

  const handleOpen = async () => {
    setOpen(true)
    setError(null)

    if (url) return // reusar si ya tenemos URL cacheada

    setLoading(true)
    try {
      const result = await getDocumentSignedUrlAction({ document_id: documentId })
      if (result.ok && result.data) {
        setUrl(result.data.url)
      } else {
        setError(result.ok ? "Respuesta inesperada del servidor" : result.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={triggerClassName ?? "text-left hover:underline"}
      >
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
            aria-hidden
          />

          {/* Modal */}
          <div className="relative z-10 grid place-items-center min-h-screen p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-title"
              className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                  <h2
                    id="preview-title"
                    className="font-medium text-gray-900 text-sm truncate"
                  >
                    {fileName}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {url && (
                    <>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir
                      </a>
                      <a
                        href={url}
                        download={fileName}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1730c4]"
                      >
                        <Download className="h-3.5 w-3.5" /> Descargar
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-auto bg-gray-50 grid place-items-center min-h-[50vh]">
                {loading && (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">Generando enlace seguro...</p>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        No pudimos cargar el documento
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{error}</p>
                    </div>
                  </div>
                )}

                {url && !loading && !error && (
                  <PreviewContent url={url} category={category} fileName={fileName} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PreviewContent({
  url,
  category,
  fileName,
}: {
  url: string
  category: "image" | "pdf" | "office" | "other"
  fileName: string
}) {
  if (category === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={fileName}
        className="max-w-full max-h-[78vh] object-contain bg-white shadow"
      />
    )
  }

  if (category === "pdf") {
    return (
      <iframe
        src={url}
        title={fileName}
        className="w-full h-[78vh] bg-white border-0"
      />
    )
  }

  if (category === "office") {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <FileText className="h-10 w-10 text-gray-400" />
        <div>
          <p className="font-medium text-gray-900">Vista previa no disponible</p>
          <p className="mt-1 text-sm text-gray-600 max-w-sm">
            Word y Excel no se pueden previsualizar en el navegador. Descargalo para verlo.
          </p>
        </div>
        <a
          href={url}
          download={fileName}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4]"
        >
          <Download className="h-4 w-4" /> Descargar archivo
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <FileText className="h-10 w-10 text-gray-400" />
      <p className="text-sm text-gray-600">Tipo de archivo no soportado para preview</p>
      <a
        href={url}
        download={fileName}
        className="inline-flex items-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1730c4]"
      >
        <Download className="h-4 w-4" /> Descargar
      </a>
    </div>
  )
}

function getCategory(
  fileName: string,
  mimeType?: string | null
): "image" | "pdf" | "office" | "other" {
  const mt = (mimeType ?? "").toLowerCase()
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""

  if (mt.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return "image"
  }
  if (mt === "application/pdf" || ext === "pdf") {
    return "pdf"
  }
  if (
    mt.includes("msword") ||
    mt.includes("officedocument") ||
    mt.includes("ms-excel") ||
    ["doc", "docx", "xls", "xlsx"].includes(ext)
  ) {
    return "office"
  }
  return "other"
}
