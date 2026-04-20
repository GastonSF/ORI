'use client'

import { cn } from '@/lib/utils'
import type { DocStatus, ClientState } from '@/lib/types'
import { DOC_STATUS_CONFIG, CLIENT_STATE_CONFIG } from '@/lib/constants'

interface StatusBadgeProps {
  status: DocStatus | ClientState
  variant?: 'doc' | 'client'
  className?: string
}

export function StatusBadge({ status, variant = 'doc', className }: StatusBadgeProps) {
  const config = variant === 'doc' 
    ? DOC_STATUS_CONFIG[status as DocStatus] 
    : CLIENT_STATE_CONFIG[status as ClientState]

  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {config.label}
    </span>
  )
}
