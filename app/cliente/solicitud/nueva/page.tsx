import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft } from "lucide-react"
import { NewApplicationForm } from "@/components/cliente/new-application-form"

export default async function NewApplicationPage() {
  const { user } = await requireRole("client")
  const supabase = await createClient()

  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name, onboarding_completed")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) redirect("/cliente/onboarding")
  if (!client.onboarding_completed) redirect("/cliente/onboarding")

  // Chequear que no tenga otra activa
  const { data: activeApp } = await supabase
    .from("applications")
    .select("id, application_number")
    .eq("client_id", client.id)
    .not(
      "status",
      "in",
      `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`
    )
    .maybeSingle()

  if (activeApp) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <Link
            href="/cliente"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al panel
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva solicitud</h1>
        </header>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ya tenés un legajo activo ({activeApp.application_number}). Finalizá o cancelalo
          antes de iniciar otro.{" "}
          <Link href="/cliente/solicitud" className="underline font-medium">
            Ver mi legajo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/cliente"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al panel
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Nueva solicitud de crédito</h1>
        <p className="mt-1 text-sm text-gray-600">{client.legal_name}</p>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <NewApplicationForm clientId={client.id} />
      </div>
    </div>
  )
}
