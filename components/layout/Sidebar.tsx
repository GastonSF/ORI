'use client'

import { 
  Home, Users, Plus, Mail, BarChart2, Settings, ClipboardList, CheckCircle, BarChart3,
  type LucideIcon 
} from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { cn } from '@/lib/utils'
import type { AppRole } from '@/lib/types'

const iconMap: Record<string, LucideIcon> = {
  Home,
  Users,
  Plus,
  Mail,
  BarChart2,
  Settings,
  ClipboardList,
  CheckCircle,
  BarChart3,
}

interface SidebarItem {
  id: string
  label: string
  icon: string
}

interface SidebarProps {
  role: AppRole
  items: SidebarItem[]
  activeItem: string
  onItemClick: (id: string) => void
  userName: string
  subtitle?: string
}

export function Sidebar({ role, items, activeItem, onItemClick, userName, subtitle }: SidebarProps) {
  const roleSubtitles: Record<NonNullable<AppRole>, string> = {
    oficial: 'Oficial de Sucursal',
    analista: 'Analista de Crédito',
    cliente: 'Cliente',
  }

  return (
    <aside className="w-60 h-screen bg-[#1B3FD8] flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6">
        <span className="text-lg font-bold tracking-[0.12em] text-white">WORCAP</span>
        {role && (
          <p className="text-white/60 text-xs mt-1">{subtitle || roleSubtitles[role]}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = iconMap[item.icon] || Home
            const isActive = activeItem === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/20">
        <div className="flex items-center gap-3">
          <UserAvatar name={userName} size="sm" variant="sidebar" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
