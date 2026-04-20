'use client'

import { UserCircle, Briefcase, BarChart3 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { AppRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RoleCardProps {
  icon: typeof UserCircle
  title: string
  description: string
  onClick: () => void
  selected?: boolean
}

function RoleCard({ icon: Icon, title, description, onClick, selected }: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white border rounded-xl p-6 transition-all cursor-pointer',
        selected
          ? 'border-2 border-[#1B3FD8] bg-[#E8EDFD]'
          : 'border-[#E5E7EB] hover:border-[#1B3FD8] hover:shadow-sm'
      )}
    >
      <Icon className="w-8 h-8 text-[#1B3FD8] mb-4" />
      <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">{title}</h3>
      <p className="text-sm text-[#6B7280]">{description}</p>
    </button>
  )
}

export function RoleSelector() {
  const { setRole } = useApp()

  const handleRoleSelect = (role: AppRole) => {
    setRole(role)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Blue */}
      <div className="w-2/5 bg-[#1B3FD8] p-12 flex flex-col justify-center">
        <span className="text-4xl font-bold tracking-[0.12em] text-white">WORCAP</span>
        <p className="text-white/70 text-sm mt-3">
          Plataforma de originación de crédito
        </p>
        <div className="w-16 h-px bg-white/20 my-6" />
        <p className="text-white/80 text-sm max-w-[280px] leading-relaxed">
          Simplificamos el proceso de onboarding y análisis crediticio para empresas
          de todos los tamaños. Seguro, eficiente y transparente.
        </p>
      </div>

      {/* Right Panel - White */}
      <div className="w-3/5 bg-white p-12 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-8">
            Seleccioná tu perfil para continuar
          </h2>

          <div className="space-y-4">
            <RoleCard
              icon={UserCircle}
              title="Soy cliente"
              description="Completá tu onboarding y cargá tus documentos"
              onClick={() => handleRoleSelect('cliente')}
            />
            <RoleCard
              icon={Briefcase}
              title="Oficial de sucursal"
              description="Creá y gestioná perfiles de clientes"
              onClick={() => handleRoleSelect('oficial')}
            />
            <RoleCard
              icon={BarChart3}
              title="Analista de crédito"
              description="Revisá solicitudes y aprobá documentos"
              onClick={() => handleRoleSelect('analista')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
