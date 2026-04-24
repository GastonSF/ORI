"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, LogOut, Check, Circle } from "lucide-react"
import type { Client, CompanyMember } from "@/types/database.types"
import type { DocumentType, FundingLine } from "@/lib/constants/roles"
import { StepClientType } from "./steps/step-client-type"
import { StepGeneralData } from "./steps/step-general-data"
import { StepCompanyStructure } from "./steps/step-company-structure"
import { StepFundingRequest } from "./steps/step-funding-request"
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
  // Datos del legajo activo para pre-cargar la sección "Tu solicitud"
  requestedAmount: number | null
  fundingLine: FundingLine | null
}

// Ahora son 6 secciones (antes 5). La 4 es la nueva "Tu solicitud".
const SECTIONS = [
  { n: 1, title: "Tu empresa", hint: "Qué tipo de organización sos" },
  { n: 2, title: "Datos generales", hint: "Información de contacto y fiscal" },
  { n: 3, title: "Quiénes la integran", hint: "Titulares y socios" },
  { n: 4, title: "Tu solicitud", hint: "Cuánto solicitás y qué línea" },
  { n: 5, title: "Documentación", hint: "Papeles de respaldo" },
  { n: 6, title: "Revisión y envío", hint: "Todo en orden, lo enviás" },
]

const TOTAL_SECTIONS = 6

// Timeline del viaje completo: ahora son 7 pasos (antes 8).
// El paso "Elegí tu línea" desapareció porque el cliente lo elige en el onboarding.
const JOURNEY_STEPS = [
  "Contanos sobre vos",
  "Recibimos tu solicitud",
  "Revisamos tus documentos",
  "Sumá la documentación de tu línea",
  "Revisamos lo que sumaste",
  "Analizamos tu solicitud",
  "Tenés una respuesta",
]

export function OnboardingWizard({
  initialStep,
  client,
  members,
  applicationId,
  applicationNumber,
  existingDocs,
  requestedAmount,
  fundingLine,
}: Props) {
  const router = useRouter()
  const [currentSection, setCurrentSection] = useState(initialStep)
  const [localMaxReached, setLocalMaxReached] = useState(client?.onboarding_step ?? 1)
  const serverMaxReached = client?.onboarding_step ?? 1
  const maxReached = Math.max(localMaxReached, serverMaxReached)

  const jumpTo = (section: number) => {
    if (section <= maxReached || section <= currentSection) {
      setCurrentSection(section)
      router.replace(`/cliente/onboarding?paso=${section}`, { scroll: false })
      router.refresh()
    }
  }

  const advanceToNext = () => {
    const nextSection = Math.min(currentSection + 1, TOTAL_SECTIONS)
    setLocalMaxReached((prev) => Math.max(prev, nextSection))
    setCurrentSection(nextSection)
    router.replace(`/cliente/onboarding?paso=${nextSection}`, { scroll: false })
    router.refresh()
  }

  const back = () => jumpTo(Math.max(currentSection - 1, 1))

  const uploadedDocTypes = Object.keys(existingDocs).filter(
    (k) => existingDocs[k] !== null && existingDocs[k] !== undefined
  ) as DocumentType[]

  const currentSectionMeta = SECTIONS.find((s) => s.n === currentSection) ?? SECTIONS[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/cliente" className="text-[#1b38e8] font-bold tracking-tight text-base">
              WORCAP
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-600 truncate">
              {client?.legal_name && client.legal_name !== "__pendiente__"
                ? client.legal_name
                : "Tu solicitud"}
            </span>
          </div>

          <Link
            href="/cliente"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guardar y salir</span>
          </Link>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 shrink-0">
              {JOURNEY_STEPS.map((_, idx) => (
                <JourneyDot key={idx} idx={idx} currentIdx={0} />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[#1b38e8] uppercase tracking-wide">
                Paso 1 de {JOURNEY_STEPS.length}
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate">{JOURNEY_STEPS[0]}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-6">
              <div className="mb-4">
                <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Para completar este paso
                </h2>
                <p className="text-sm text-gray-600">
                  Completá las secciones en orden. Podés volver a cualquiera cuando quieras.
                </p>
              </div>

              <ol className="space-y-1">
                {SECTIONS.map((s) => {
                  const isCurrent = currentSection === s.n
                  const isDone = maxReached > s.n
                  const isReachable = s.n <= maxReached

                  return (
                    <li key={s.n}>
                      <button
                        type="button"
                        onClick={() => isReachable && jumpTo(s.n)}
                        disabled={!isReachable}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-all ${
                          isCurrent
                            ? "bg-[#eff3ff] border border-[#1b38e8]/20"
                            : isReachable
                            ? "hover:bg-white hover:border hover:border-gray-200 border border-transparent"
                            : "opacity-50 cursor-not-allowed border border-transparent"
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isDone ? (
                            <div className="h-5 w-5 rounded-full bg-[#1b38e8] flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            </div>
                          ) : isCurrent ? (
                            <div className="h-5 w-5 rounded-full border-2 border-[#1b38e8] flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-[#1b38e8]" />
                            </div>
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              isCurrent
                                ? "font-semibold text-gray-900"
                                : isDone
                                ? "text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            {s.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.hint}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          </aside>

          <section className="lg:col-span-8">
            <div className="mb-5">
              <h1 className="text-2xl font-semibold text-gray-900">{currentSectionMeta.title}</h1>
              <p className="mt-1 text-sm text-gray-600">{currentSectionMeta.hint}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
              {currentSection === 1 && <StepClientType client={client} onDone={advanceToNext} />}
              {currentSection === 2 && <StepGeneralData client={client} onDone={advanceToNext} />}
              {currentSection === 3 && (
                <StepCompanyStructure client={client} members={members} onDone={advanceToNext} />
              )}
              {currentSection === 4 && (
                <StepFundingRequest
                  client={client}
                  existingAmount={requestedAmount}
                  existingLine={fundingLine}
                  onDone={advanceToNext}
                />
              )}
              {currentSection === 5 && client && (
                <StepDocumentation
                  client={client}
                  applicationId={applicationId}
                  applicationNumber={applicationNumber}
                  existingDocs={existingDocs}
                  onDone={advanceToNext}
                />
              )}
              {currentSection === 6 && client && (
                <StepReview client={client} members={members} uploadedDocTypes={uploadedDocTypes} />
              )}
            </div>

            {currentSection > 1 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Volver
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function JourneyDot({ idx, currentIdx }: { idx: number; currentIdx: number }) {
  if (idx < currentIdx) {
    return <span className="h-2 w-2 rounded-full bg-[#1b38e8]" />
  }
  if (idx === currentIdx) {
    return <span className="h-2 w-2 rounded-full bg-[#1b38e8] ring-2 ring-[#c7d0fb]" />
  }
  return <span className="h-2 w-2 rounded-full bg-gray-200" />
}
