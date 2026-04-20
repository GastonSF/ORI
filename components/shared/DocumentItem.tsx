'use client'

import { Upload, Eye, Check, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import type { Document as DocType } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface DocumentItemProps {
  document: DocType
  onUpload?: () => void
  onApprove?: () => void
  onReject?: (motivo: string) => void
  onView?: () => void
  onReupload?: () => void
  mode: 'client' | 'analyst'
}

export function DocumentItem({
  document,
  onUpload,
  onApprove,
  onReject,
  onView,
  onReupload,
  mode,
}: DocumentItemProps) {
  const { nombre, estado, fechaCarga, motivoRechazo, obligatorio } = document

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-[#1A1A2E] truncate">{nombre}</h4>
            {obligatorio && <span className="text-[#EF4444] text-xs">*</span>}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <StatusBadge status={estado} />
            {fechaCarga && (
              <span className="text-xs text-[#6B7280]">
                Cargado: {formatDate(fechaCarga)}
              </span>
            )}
          </div>
          {estado === 'rechazado' && motivoRechazo && (
            <p className="mt-2 text-xs text-[#B91C1C] bg-[#FEE2E2] rounded px-2 py-1">
              Motivo: {motivoRechazo}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {mode === 'client' && (
            <>
              {estado === 'pendiente' && (
                <Button
                  onClick={onUpload}
                  size="sm"
                  className="bg-[#1B3FD8] hover:bg-[#0F2BAA] text-white"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Subir
                </Button>
              )}
              {estado === 'rechazado' && (
                <Button
                  onClick={onReupload}
                  size="sm"
                  variant="outline"
                  className="border-[#1B3FD8] text-[#1B3FD8] hover:bg-[#E8EDFD]"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Volver a subir
                </Button>
              )}
            </>
          )}

          {mode === 'analyst' && (
            <>
              {(estado === 'subido' || estado === 'enRevision') && (
                <>
                  <Button
                    onClick={onApprove}
                    size="sm"
                    variant="outline"
                    className="border-[#22C55E] text-[#15803D] hover:bg-[#DCFCE7]"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprobar
                  </Button>
                  <Button
                    onClick={() => onReject?.('Documento ilegible o incompleto')}
                    size="sm"
                    variant="outline"
                    className="border-[#EF4444] text-[#B91C1C] hover:bg-[#FEE2E2]"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                </>
              )}
              {estado !== 'pendiente' && (
                <Button
                  onClick={onView}
                  size="sm"
                  variant="ghost"
                  className="text-[#6B7280] hover:bg-[#F4F5F9]"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
