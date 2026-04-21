import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ArrowRight, Building2, Briefcase, AlertCircle } from "lucide-react"
import { requireRole } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import {
  FUNDING_LINES,
  FUNDING_LINE_LABELS,
  FUNDING_LINE_DESCRIPTIONS,
  type FundingLine,
} from "@/lib/constants/roles"
import { ChooseFundingLineButton } from "@/components/cliente/choose-funding-line-button"

/**
 * Pantalla del paso 4: el cliente elige su línea de fondeo.
 *
 * Solo se muestran las líneas que el analista habilitó (campo
 * applications.enabled_funding_lines). Si solo hay una habilitada,
 * igualmente la mostramos como card para que el cliente confirme
 * activamente la elección.
 *
 * Si el legajo no está en estado awaiting_funding_line_choice,
 * redirige al detalle del legajo.
 */
export default async function EleccionLineaPage() {
  const { user } = await requireRole("client")
  const supabase = await createClient()

  // Cliente del usuario
  const { data: client } = await supabase
    .from("clients")
    .select("id, legal_name")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  if (!client) redirect("/cliente")

  // Legajo activo
  const { data: app } = await supabase
    .from("applications")
    .select("id, application_number, status, enabled_funding_lines, funding_line")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!app) redirect("/cliente")

  // Si no está en el estado correcto, redirigir
  if (app.status !== "awaiting_funding_line_choice") {
    redirect("/cliente/solicitud")
  }

  const enabledLines = (app.enabled_funding_lines ?? []) as FundingLine[]

  // Edge case: el analista pasó al estado pero no habilitó ninguna línea
  if (enabledLines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <Link
          href="/cliente"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al panel
        </Link>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-amber-900">
              Esperando habilitación
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              WORCAP todavía no habilitó ninguna línea para vos. Te avisaremos
              cuando esté lista para elegir.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/cliente/solicitud"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al detalle
      </Link>

      {/* Header */}
      <header className="text-center max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-wider text-gray-500">
          Paso 4 · Legajo {app.application_number}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
          Elegí tu línea de fondeo
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Tu documentación inicial fue aprobada. Ahora elegí la línea que mejor
          se ajuste a tu empresa. Después te pediremos la documentación
          específica de la línea elegida.
        </p>
      </header>

      {/* Cards de líneas */}
      <div
        className={`grid gap-5 ${
          enabledLines.length === 1
            ? "max-w-md mx-auto"
            : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {FUNDING_LINES.filter((l) => enabledLines.includes(l)).map((line) => (
          <FundingLineCard key={line} line={line} applicationId={app.id} />
        ))}
      </div>

      {/* Aclaración */}
      <p className="text-xs text-center text-gray-500 max-w-xl mx-auto">
        Una vez que elijas una línea, podrás cambiar pidiéndoselo a tu oficial.
        El cambio puede requerir documentación adicional.
      </p>
    </div>
  )
}

function FundingLineCard({
  line,
  applicationId,
}: {
  line: FundingLine
  applicationId: string
}) {
  const isFGPlus = line === "fgplus"
  const Icon = isFGPlus ? Building2 : Briefcase
  const label = FUNDING_LINE_LABELS[line]
  const description = FUNDING_LINE_DESCRIPTIONS[line]

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white p-6 hover:border-[#1b38e8] transition-colors flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`h-12 w-12 rounded-lg grid place-items-center shrink-0 ${
            isFGPlus ? "bg-blue-50 text-[#1b38e8]" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isFGPlus
              ? "Para entidades financieras"
              : "Para PyMEs en general"}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed flex-1">{description}</p>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
          Te vamos a pedir
        </p>
        <ul className="space-y-1.5 text-xs text-gray-700">
          {isFGPlus ? (
            <>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Composición de cartera (Excel)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Política de originación</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Política de cobranza</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Convenios con terceros (si corresponde)</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Plan de negocios</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Flujo de ventas proyectado</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Avales personales (si corresponde)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>Otros documentos según tu caso</span>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="mt-5">
        <ChooseFundingLineButton
          applicationId={applicationId}
          line={line}
          label={`Elegir ${label}`}
        />
      </div>
    </div>
  )
}
