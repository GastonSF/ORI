"use client"

import { useState, useTransition, useRef } from "react"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"
import { X, Upload, Loader2, FileText, AlertCircle, Info } from "lucide-react"
import { uploadDocumentAsStaffAction } from "@/lib/actions/upload-document-as-staff"
import {
  DOCUMENT_TYPE_LABELS,
  REQUIRED_DOCS_BY_CLIENT_TYPE,
  type DocumentType,
  type ClientType,
} from "@/lib/constants/roles"

type Props = {
  open: boolean
  onClose: () => void
  applicationId: string
  applicationNumber: string
  clientType: ClientType
  clientId: string
  alreadyUploadedTypes: string[]
}

const MAX_FILE_SIZE_MB = 15
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function LegajoUploadDocModal({
  open,
  onClose,
  applicationId,
  applicationNumber,
  clientType,
  clientId,
  alreadyUploadedTypes,
}: Props) {
  const [docType, setDocType] = useState<DocumentType | "">("")
  const [file, setFile] = useState<File | null>(null)
  const [motivo, setMotivo] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isUploading, startUpload] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  // Docs que pide este tipo de cliente pero todavía no se subieron
  const requiredDocs = REQUIRED_DOCS_BY_CLIENT_TYPE[clientType] ?? []
  const missingDocs = requiredDocs.filter((d) => !alreadyUploadedTypes.includes(d))

  const resetForm = () => {
    setDocType("")
    setFile(null)
    setMotivo("")
    setErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleClose = () => {
    if (isUploading) return
    resetForm()
    onClose()
  }

  const handleFilePick = (picked: File | null) => {
    setErrors((e) => ({ ...e, file: "" }))
    if (!picked) {
      setFile(null)
      return
    }
    if (picked.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrors((e) => ({
        ...e,
        file: `El archivo supera ${MAX_FILE_SIZE_MB}MB`,
      }))
      return
    }
    if (!ALLOWED_MIME.includes(picked.type)) {
      setErrors((e) => ({
        ...e,
        file: "Formato no permitido. Aceptamos PDF, imágenes, Excel o Word",
      }))
      return
    }
    setFile(picked)
  }

  const handleSubmit = () => {
    setErrors({})
    const newErrors: Record<string, string> = {}
    if (!docType) newErrors.docType = "Elegí el tipo de documento"
    if (!file) newErrors.file = "Seleccioná un archivo"
    if (motivo.trim().length < 10) {
      newErrors.motivo = "El motivo tiene que tener al menos 10 caracteres"
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Completá los campos obligatorios")
      return
    }

    startUpload(async () => {
      try {
        // 1. Subir el archivo a Storage
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const safeName = file!.name.replace(/[^\w.\-]/g, "_")
        const filePath = `${clientId}/${applicationId}/staff-upload-${Date.now()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file!, {
            contentType: file!.type,
            upsert: false,
          })

        if (uploadError) {
          toast.error(`Error subiendo archivo: ${uploadError.message}`)
          return
        }

        // 2. Registrar el documento en DB via server action
        const res = await uploadDocumentAsStaffAction({
          application_id: applicationId,
          document_type: docType,
          file_name: file!.name,
          file_path: filePath,
          file_size_bytes: file!.size,
          mime_type: file!.type,
          motivo: motivo.trim(),
        })

        if (!res.ok) {
          // Intentar limpiar el archivo huérfano en Storage
          await supabase.storage.from("documents").remove([filePath]).catch(() => {})
          toast.error(res.error)
          return
        }

        toast.success("Documento subido correctamente")
        resetForm()
        onClose()
      } catch (err) {
        toast.error("Error inesperado subiendo el documento")
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-[#1b38e8]" />
            <h2 className="text-sm font-semibold text-gray-900">
              Subir documento en nombre del cliente
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Aviso informativo */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#eff3ff] border border-blue-100">
            <Info className="h-4 w-4 text-[#1b38e8] shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700">
              <p className="font-medium text-gray-900">
                Subida en nombre del cliente — legajo {applicationNumber}
              </p>
              <p className="mt-0.5">
                Este documento queda registrado como subido por vos. Se guarda en el log
                de auditoría con tu nombre, IP y el motivo que indiques.
              </p>
            </div>
          </div>

          {/* Tipo de documento */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              disabled={isUploading}
              className={`w-full text-sm text-gray-900 bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] ${
                errors.docType ? "border-red-300" : "border-gray-200"
              }`}
            >
              <option value="">Seleccioná un tipo...</option>
              {missingDocs.length > 0 ? (
                <optgroup label="Documentos pendientes del cliente">
                  {missingDocs.map((d) => (
                    <option key={d} value={d}>
                      {DOCUMENT_TYPE_LABELS[d]}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="Otros">
                {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[])
                  .filter((d) => !missingDocs.includes(d))
                  .map((d) => (
                    <option key={d} value={d}>
                      {DOCUMENT_TYPE_LABELS[d]}
                    </option>
                  ))}
              </optgroup>
            </select>
            {errors.docType ? (
              <p className="mt-1 text-xs text-red-600">{errors.docType}</p>
            ) : null}
          </div>

          {/* Selector de archivo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Archivo <span className="text-red-500">*</span>
            </label>
            <div
              className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                errors.file
                  ? "border-red-300 bg-red-50/50"
                  : file
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-gray-300 hover:border-[#1b38e8] hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx"
                onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
                disabled={isUploading}
                className="hidden"
                id="staff-upload-file"
              />
              <label
                htmlFor="staff-upload-file"
                className="cursor-pointer block"
              >
                {file ? (
                  <div className="space-y-1">
                    <FileText className="h-6 w-6 text-emerald-600 mx-auto" />
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {(file.size / 1024).toFixed(0)} KB · Clic para cambiar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-6 w-6 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-700">
                      Clic para seleccionar un archivo
                    </p>
                    <p className="text-[10px] text-gray-500">
                      PDF, imágenes, Excel o Word · máx {MAX_FILE_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </label>
            </div>
            {errors.file ? (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.file}
              </p>
            ) : null}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Motivo de la carga <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={isUploading}
              placeholder="Ej: El cliente me pasó el balance por WhatsApp porque tuvo problemas con el dropzone."
              rows={3}
              className={`w-full text-sm text-gray-900 bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1b38e8] focus:border-[#1b38e8] resize-none ${
                errors.motivo ? "border-red-300" : "border-gray-200"
              }`}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">
                Queda registrado en auditoría
              </p>
              <p className="text-[10px] text-gray-400">
                {motivo.trim().length} / 10 mínimos
              </p>
            </div>
            {errors.motivo ? (
              <p className="mt-1 text-xs text-red-600">{errors.motivo}</p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-3.5 py-2 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || !file || !docType || motivo.trim().length < 10}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1b38e8] text-white text-sm font-medium hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Subir documento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
