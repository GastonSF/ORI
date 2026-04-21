"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, ChevronLeft, LogOut } from "lucide-react"
import type { Client, CompanyMember } from "@/types/database.types"
import type { DocumentType } from "@/lib/constants/roles"
import { StepClientType } from "./steps/step-client-type"
import { StepGeneralData } from "./steps/step-general-data"
import { StepCompanyStructure } from "./steps/step-company-structure"
import { StepDocumentation } from "./steps/step-documentation"
import { StepReview } from "./steps/step-review"

type ExistingDoc = {
  id: string
  document_type: string
  file_name: string
  file_size_bytes: number | null
  status: string
} | null

type Props = {
  initialStep: number
  client: Client | null
  members: CompanyMember[]
  applicationId: string | null
  applicationNumber: string | null
  existingDocs: Record<string, ExistingDoc>
}

const STEP_LABELS = [
  { n: 1, label: "Tipo de cliente" },
  { n: 2, label: "Datos generales" },
  { n: 3, label: "Estructura societaria" },
  { n: 4, label: "Documentación" },
  { n: 5, label: "Revisión y envío" },
]

export function OnboardingWizard({
  initialStep,
  client,
  members,
  applicationId,
  applicationNumber,
  existingDocs,
}: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(initialStep)
  const maxReachedStep = client?.onboarding_step ?? 1

  const goTo = (step: number) => {
    if (step <= maxReachedStep || step <= currentStep) {
      setCurrentStep(step)
      router.replace(`/cliente/onboarding?paso=${step}`, { scroll: false })
      router.refresh()
    }
  }

  const next = () => goTo(Math.min(currentStep + 1, 5))
  const back = () => goTo(Math.max(currentStep - 1, 1))

  const progress = Math.min((maxReachedStep / 5) * 100, 100)

  const uploadedDocTypes = Object.keys(existingDocs).filter(
    (k) => existingDocs[k] !== null && existingDocs[k] !== undefined
  ) as DocumentType[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/cliente" className="text-[#1b38e8] font-bold tracking-tight">
              WORCAP
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-700 truncate">
              {client?.legal_name && client.legal_name !== "__pendiente__"
                ? client.legal_name
                : "Onboarding"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-[#1b38e8] font-medium">
              {Math.round(progress)}% completado
            </span>
            <Link
              href="/cliente"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guardar y salir</span>
            </Link>
          </div>
        </div>

        <nav aria-label="Pasos del onboarding" className="max-w-5xl mx-auto px-6 pb-4">
          <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {STEP_LABELS.map((s, idx) => {
              const isCurrent = currentStep === s.n
              const isDone = maxReachedStep > s.n || (s.n < currentStep && maxReachedStep >= s.n)
              const isReachable = s.n <= maxReachedStep
              return (
                <li key={s.n} className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => isReachable && goTo(s.n)}
                    disabled={!isReachable}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs sm:text-sm transition ${
                      isCurrent
                        ? "text-[#1b38e8] font-semibold"
                        : isDone
                          ? "text-gray-700 hover:bg-gray-100"
                          : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full grid place-items-center text-xs shrink-0 ${
                        isCurrent
                          ? "border-2 border-[#1b38e8] text-[#1b38e8]"
                          : isDone
                            ? "bg-[#1b38e8] text-white"
                            : "border-2 border-gray-300 text-gray-400"
                      }`}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : s.n}
                    </span>
                    <span className="hidden sm:inline whitespace-nowrap">{s.label}</span>
                  </button>
                  {idx < STEP_LABELS.length - 1 && (
                    <span className="hidden sm:block h-px w-6 bg-gray-300 shrink-0" />
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8">
          {currentStep === 1 && <StepClientType client={client} onDone={() => next()} />}
          {currentStep === 2 && <StepGeneralData client={client} onDone={() => next()} />}
          {currentStep === 3 && (
            <StepCompanyStructure client={client} members={members} onDone={() => next()} />
          )}
          {currentStep === 4 && client && (
            <StepDocumentation
              client={client}
              applicationId={applicationId}
              applicationNumber={applicationNumber}
              existingDocs={existingDocs}
              onDone={() => next()}
            />
          )}
          {currentStep === 5 && client && (
            <StepReview client={client} members={members} uploadedDocTypes={uploadedDocTypes} />
          )}
        </div>

        {currentStep > 1 && (
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
