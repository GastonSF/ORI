import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { OnboardingWizard } from "@/components/cliente/onboarding-wizard"
import { redirect } from "next/navigation"

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

  if (client) {
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
      applicationId = activeApp.id
      applicationNumber = activeApp.application_number
    } else if ((client.onboarding_step ?? 1) >= 3) {
      const { data: newApp } = await supabase
        .from("applications")
        .insert({
          client_id: client.id,
          status: "draft",
          current_owner_role: "client",
        })
        .select("id, application_number")
        .single()
      if (newApp) {
        applicationId = newApp.id
        applicationNumber = newApp.application_number
      }
    }
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

  const requestedStep = searchParams.paso ? Number(searchParams.paso) : null
  const currentStep =
    requestedStep && requestedStep >= 1 && requestedStep <= 5
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
    />
  )
}
