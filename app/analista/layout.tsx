import { requireRole } from "@/lib/auth/session"
import { TopBar } from "@/components/shared/top-bar"
import { Sidebar } from "@/components/shared/sidebar"

export default async function AnalystLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("analyst")

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar profile={profile} subtitle="Analista de riesgos" />
      <div className="flex-1 flex">
        <Sidebar role="analyst" />
        <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
