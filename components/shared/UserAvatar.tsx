'use client'

import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  variant?: 'default' | 'sidebar'
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function UserAvatar({ name, size = 'md', className, variant = 'default' }: UserAvatarProps) {
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium',
        sizeClasses[size],
        variant === 'sidebar' ? 'bg-white/20 text-white' : 'bg-[#E8EDFD] text-[#1B3FD8]',
        className
      )}
    >
      {initials}
    </div>
  )
}
