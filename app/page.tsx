'use client'

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

export default function Page() {
  return (
    <AppProvider>
      <AppContent />
      <ToastContainer />
    </AppProvider>
  )
}
