'use client'

import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { ToastType } from '@/lib/types'

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}

const colorMap: Record<ToastType, { border: string; icon: string }> = {
  success: { border: 'border-l-[#22C55E]', icon: 'text-[#22C55E]' },
  warning: { border: 'border-l-[#F59E0B]', icon: 'text-[#F59E0B]' },
  error: { border: 'border-l-[#EF4444]', icon: 'text-[#EF4444]' },
  info: { border: 'border-l-[#3B82F6]', icon: 'text-[#3B82F6]' },
}

export function ToastContainer() {
  const { state, dispatch } = useApp()

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }

  if (state.toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {state.toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        const colors = colorMap[toast.type]

        return (
          <div
            key={toast.id}
            className={`toast-enter bg-white rounded-lg border-l-4 shadow-lg p-4 min-w-[300px] max-w-[400px] flex items-start gap-3 ${colors.border}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${colors.icon}`} />
            <p className="text-sm text-[#374151] flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#6B7280] hover:text-[#374151] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
