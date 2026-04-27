import { requireRole } from "@/lib/auth/session"
import { TopBar } from "@/components/shared/top-bar"
import { Sidebar } from "@/components/shared/sidebar"
import { FooterCredit } from "@/components/shared/footer-credit"

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("client")

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar profile={profile} subtitle="Mi cuenta" />
      <div className="flex-1 flex">
        <Sidebar role="client" />
        <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
      </div>
      <FooterCredit />
    </div>
  )
}
