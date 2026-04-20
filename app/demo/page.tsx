'use client'

import Link from 'next/link'
import { AppProvider, useApp } from '@/context/AppContext'
import { ToastContainer } from '@/components/shared/ToastProvider'
import { RoleSelector } from '@/components/RoleSelector'
import { OnboardingWizard } from '@/components/client/OnboardingWizard'
import { OfficerDashboard } from '@/components/officer/OfficerDashboard'
import { AnalystPanel } from '@/components/analyst/AnalystPanel'

function AppContent() {
  const { state } = useApp()

  // Render based on role
  if (!state.role) {
    return <RoleSelector />
  }

  if (state.role === 'cliente') {
    return <OnboardingWizard />
  }

  if (state.role === 'oficial') {
    return <OfficerDashboard />
  }

  if (state.role === 'analista') {
    return <AnalystPanel />
  }

  return null
}

function DemoBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 flex items-center justify-between gap-3">
      <div>
        <strong>Modo demo</strong> — datos simulados, sin autenticación real.
      </div>
      <Link href="/" className="font-medium underline hover:no-underline whitespace-nowrap">
        Ir a la versión real →
      </Link>
    </div>
  )
}

export default function Page() {
  return (
    <AppProvider>
      <DemoBanner />
      <AppContent />
      <ToastContainer />
    </AppProvider>
  )
}
