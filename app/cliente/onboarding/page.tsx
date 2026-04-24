import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { OnboardingWizard } from "@/components/cliente/onboarding-wizard"
import { redirect } from "next/navigation"
import type { FundingLine } from "@/lib/constants/roles"

type SearchParams = Promise<{ paso?: string }>

export default async function OnboardingPage(props: { searchParams: SearchParams }) {
  const { user } = await requireRole("client")
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  const { data: members } = client
    ? await supabase
        .from("company_structure")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: true })
    : { data: [] }

  if (client?.onboarding_completed) {
    redirect("/cliente")
  }

  let applicationId: string | null = null
  let applicationNumber: string | null = null
  let requestedAmount: number | null = null
  let fundingLine: FundingLine | null = null

  if (client) {
    const { data: activeApp } = await supabase
      .from("applications")
      .select("id, application_number, requested_amount, funding_line")
      .eq("client_id", client.id)
      .not(
        "status",
        "in",
        `(approved,rejected_by_officer,rejected_by_analyst,cancelled_by_client,cancelled_by_worcap)`
      )
      .maybeSingle()

    if (activeApp) {
      applicationId = activeApp.id
      applicationNumber = activeApp.application_number
      requestedAmount = activeApp.requested_amount
        ? Number(activeApp.requested_amount)
        : null
      fundingLine = (activeApp.funding_line as FundingLine | null) ?? null
    }
    // NOTA: ya no creamos el legajo acá "preventivamente" cuando el cliente
    // llega al paso 3. El legajo se crea en el paso 4 (Tu solicitud) cuando
    // guarda el monto + línea vía saveFundingRequestAction.
  }

  const { data: documents } = applicationId
    ? await supabase
        .from("documents")
        .select("id, document_type, file_name, file_size_bytes, mime_type, status, uploaded_at")
        .eq("application_id", applicationId)
        .order("uploaded_at", { ascending: false })
    : { data: [] }

  const docsMap: Record<string, (typeof documents)[number] | null> = {}
  if (documents) {
    for (const d of documents) {
      if (!docsMap[d.document_type]) docsMap[d.document_type] = d
    }
  }

  // El onboarding ahora tiene 6 secciones internas (antes 5).
  const requestedStep = searchParams.paso ? Number(searchParams.paso) : null
  const currentStep =
    requestedStep && requestedStep >= 1 && requestedStep <= 6
      ? requestedStep
      : client?.onboarding_step ?? 1

  return (
    <OnboardingWizard
      initialStep={currentStep}
      client={client ?? null}
      members={members ?? []}
      applicationId={applicationId}
      applicationNumber={applicationNumber}
      existingDocs={docsMap}
      requestedAmount={requestedAmount}
      fundingLine={fundingLine}
    />
  )
}
