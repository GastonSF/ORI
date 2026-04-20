import { createClient } from "@/lib/supabase/server"
import { Users, FileText, CheckCircle2, AlertCircle } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Queries en paralelo - RLS permite a admin ver todo
  const [
    { count: clientsCount },
    { count: applicationsCount },
    { count: approvedCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending_authorization", "docs_in_review", "in_risk_analysis"]),
  ])

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vista general de toda la plataforma.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Clientes"
          value={clientsCount ?? 0}
        />
        <KpiCard
          icon={<FileText className="h-5 w-5" />}
          label="Legajos totales"
          value={applicationsCount ?? 0}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Aprobados"
          value={approvedCount ?? 0}
          accent="green"
        />
        <KpiCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="En proceso"
          value={pendingCount ?? 0}
          accent="amber"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Próximos pasos</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <p>
            Para gestionar usuarios internos (oficiales y analistas), ingresá a{" "}
            <span className="font-medium">Usuarios</span> en el menú lateral.
          </p>
          <p className="mt-2">
            Desde <span className="font-medium">Legajos</span> podés ver todos los expedientes y su estado actual.
          </p>
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  accent = "blue",
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: "blue" | "green" | "amber"
}) {
  const tints = {
    blue: "text-[#1b38e8] bg-blue-50",
    green: "text-green-700 bg-green-50",
    amber: "text-amber-700 bg-amber-50",
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{label}</p>
        <div className={`h-9 w-9 rounded-md grid place-items-center ${tints[accent]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
