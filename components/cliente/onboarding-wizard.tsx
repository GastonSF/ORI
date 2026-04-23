"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, LogOut } from "lucide-react"
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
  mime_type?: string | null
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

// Los 5 sub-pasos internos del onboarding (completando el paso 1 del flujo de 8)
const SUB_STEPS = [
  { n: 1, label: "Tipo de cliente" },
  { n: 2, label: "Datos generales" },
  { n: 3, label: "Estructura societaria" },
  { n: 4, label: "Documentación" },
  { n: 5, label: "Revisión y envío" },
]

// Los 8 pasos del viaje completo del cliente
const GLOBAL_STEPS = [
  "Datos iniciales",
  "Pendiente de recepción",
  "Revisión económico-financiera",
  "Elección de línea",
  "Documentación adicional",
  "Revisión econ-fin",
  "Análisis crediticio",
  "Resultado",
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

  // Progreso del sub-paso actual dentro del paso 1 global
  const subProgress = Math.min((maxReachedStep / 5) * 100, 100)

  const uploadedDocTypes = Object.keys(existingDocs).filter(
    (k) => existingDocs[k] !== null && existingDocs[k] !== undefined
  ) as DocumentType[]

  const currentSubStepLabel = SUB_STEPS.find((s) => s.n === currentStep)?.label ?? ""

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        {/* Top bar: brand + acciones */}
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/cliente" className="text-[#1b38e8] font-bold tracking-tight">
              WORCAP
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-700 truncate">
              {client?.legal_name && client.legal_name !== "__pendiente__"
                ? client.legal_name
                : "Tu solicitud"}
            </span>
          </div>

          <Link
            href="/cliente"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guardar y salir</span>
          </Link>
        </div>

        {/* Timeline global de 8 pasos */}
        <div className="max-w-5xl mx-auto px-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {GLOBAL_STEPS.map((_, idx) => (
                <GlobalDot key={idx} idx={idx} currentGlobalIdx={0} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900">
                Paso 1 de 8 · {GLOBAL_STEPS[0]}
              </p>
              <p className="text-[11px] text-gray-500">
                Estás completando los datos iniciales de tu solicitud
              </p>
            </div>
            <span className="hidden sm:block text-xs text-gray-500 shrink-0">
              {Math.round(subProgress)}% del paso 1
            </span>
          </div>
        </div>

        {/* Breadcrumb discreto: sub-pasos del paso 1 */}
        <nav
          aria-label="Secciones del paso 1"
          className="max-w-5xl mx-auto px-6 pb-3 border-t border-gray-100 pt-3"
        >
          <ol className="flex items-center gap-1 overflow-x-auto text-[11px]">
            {SUB_STEPS.map((s, idx) => {
              const isCurrent = currentStep === s.n
              const isDone = maxReachedStep > s.n
              const isReachable = s.n <= maxReachedStep
              return (
                <li key={s.n} className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => isReachable && goTo(s.n)}
                    disabled={!isReachable}
                    className={`px-2 py-0.5 rounded transition ${
                      isCurrent
                        ? "text-[#1b38e8] font-semibold"
                        : isDone
                        ? "text-gray-700 hover:bg-gray-100"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {s.n}. {s.label}
                  </button>
                  {idx < SUB_STEPS.length - 1 && (
                    <span className="text-gray-300 select-none">›</span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Contextualizar dentro del paso 1 */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{currentSubStepLabel}</h1>
          <span className="text-xs text-gray-500">
            {currentStep} de 5
          </span>
        </div>

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

// ============================================================
// Dot para el timeline global de 8 pasos
// ============================================================

function GlobalDot({ idx, currentGlobalIdx }: { idx: number; currentGlobalIdx: number }) {
  if (idx < currentGlobalIdx) {
    return <span className="h-1.5 w-1.5 rounded-full bg-[#1b38e8]" />
  }
  if (idx === currentGlobalIdx) {
    return <span className="h-1.5 w-1.5 rounded-full bg-[#1b38e8] ring-2 ring-[#c7d0fb]" />
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
}
