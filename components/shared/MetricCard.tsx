'use client'

import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function MetricCard({ label, value, icon: Icon, trend }: MetricCardProps) {
  return (
    <div className="bg-[#F4F5F9] rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#6B7280]">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-[#1B3FD8]" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#1A1A2E]">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  )
}
