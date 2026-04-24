import Link from "next/link"
import {
  Building2,
  FileText,
  Inbox,
  ListChecks,
  AlertTriangle,
  FileSearch,
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRight,
  GitBranch,
  UploadCloud,
  ScanLine,
  Mail,
} from "lucide-react"
import {
  getStatusBucket,
  type ApplicationStatus,
  type FundingLine,
} from "@/lib/constants/roles"

type Props = {
  clientName: string
  hasClient: boolean
  onboardingCompleted: boolean
  onboardingStep: number
  activeApp: {
    id: string
    application_number: string | null
    status: ApplicationStatus
    funding_line: FundingLine | null
    submitted_at: string | null
  } | null
  docsPending: number
  additionalDocsPending?: number
}

type HeroVariant = {
  tone: "info" | "action" | "warning" | "success" | "error" | "neutral"
  icon: React.ElementType
  title: string
  description: string
  cta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export function DashboardHero({
  clientName,
  hasClient,
  onboardingCompleted,
  onboardingStep,
  activeApp,
  docsPending,
  additionalDocsPending = 0,
}: Props) {
  const variant = pickVariant({
    clientName,
    hasClient,
    onboardingCompleted,
    onboardingStep,
    activeApp,
    docsPending,
    additionalDocsPending,
  })

  const Icon = variant.icon
  const toneStyles = TONE_STYLES[variant.tone]

  return (
    <section
      className={`rounded-xl border p-6 sm:p-7 ${toneStyles.container}`}
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-12 w-12 rounded-lg grid place-items-center shrink-0 ${toneStyles.iconBox}`}
        >
          <Icon className={`h-6 w-6 ${toneStyles.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className={`text-lg sm:text-xl font-semibold ${toneStyles.title}`}>
            {variant.title}
          </h2>
          <p className={`mt-1 text-sm ${toneStyles.description}`}>
            {variant.description}
          </p>

          {(variant.cta || variant.secondaryCta) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {variant.cta && (
                <Link
                  href={variant.cta.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${toneStyles.primaryButton}`}
                >
                  {variant.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {variant.secondaryCta && (
                <Link
                  href={variant.secondaryCta.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium border ${toneStyles.secondaryButton}`}
                >
                  {variant.secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const TONE_STYLES = {
  info: {
    container: "bg-blue-50/40 border-blue-100",
    iconBox: "bg-blue-100",
    iconColor: "text-[#1b38e8]",
    title: "text-gray-900",
    description: "text-gray-700",
    primaryButton: "bg-[#1b38e8] text-white hover:bg-[#1730c4]",
    secondaryButton:
      "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
  },
  action: {
    container: "bg-[#1b38e8]/5 border-[#1b38e8]/30",
    iconBox: "bg-[#1b38e8]",
    iconColor: "text-white",
    title: "text-gray-900",
    description: "text-gray-700",
    primaryButton: "bg-[#1b38e8] text-white hover:bg-[#1730c4]",
    secondaryButton:
      "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
  },
  warning: {
    container: "bg-amber-50 border-amber-200",
    iconBox: "bg-amber-100",
    iconColor: "text-amber-700",
    title: "text-amber-900",
    description: "text-amber-800",
    primaryButton: "bg-amber-600 text-white hover:bg-amber-700",
    secondaryButton:
      "bg-white border-amber-300 text-amber-800 hover:bg-amber-50",
  },
  success: {
    container: "bg-green-50 border-green-200",
    iconBox: "bg-green-100",
    iconColor: "text-green-700",
    title: "text-green-900",
    description: "text-green-800",
    primaryButton: "bg-green-600 text-white hover:bg-green-700",
    secondaryButton:
      "bg-white border-green-300 text-green-800 hover:bg-green-50",
  },
  error: {
    container: "bg-red-50 border-red-200",
    iconBox: "bg-red-100",
    iconColor: "text-red-700",
    title: "text-red-900",
    description: "text-red-800",
    primaryButton: "bg-red-600 text-white hover:bg-red-700",
    secondaryButton:
      "bg-white border-red-300 text-red-800 hover:bg-red-50",
  },
  neutral: {
    container: "bg-gray-50 border-gray-200",
    iconBox: "bg-gray-200",
    iconColor: "text-gray-600",
    title: "text-gray-900",
    description: "text-gray-600",
    primaryButton: "bg-gray-700 text-white hover:bg-gray-800",
    secondaryButton:
      "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
  },
} as const

function pickVariant({
  clientName,
  hasClient,
  onboardingCompleted,
  onboardingStep,
  activeApp,
  docsPending,
  additionalDocsPending,
}: Props): HeroVariant {
  // CASO 1: Sin empresa cargada
  if (!hasClient) {
    return {
      tone: "action",
      icon: Building2,
      title: `¡Hola, ${clientName}! Empecemos tu alta en WORCAP`,
      description:
        "Completá los datos de tu empresa en un proceso de 6 pasos. Podés guardar y continuar cuando quieras.",
      cta: { label: "Iniciar onboarding", href: "/cliente/onboarding" },
    }
  }

  // CASO 2: Onboarding incompleto
  if (!onboardingCompleted) {
    const pasosFaltantes = Math.max(0, 6 - onboardingStep)
    return {
      tone: "action",
      icon: ListChecks,
      title: "Continuá tu onboarding donde lo dejaste",
      description:
        pasosFaltantes === 1
          ? "Te falta 1 paso para completar tu solicitud y enviarla a WORCAP."
          : `Te faltan ${pasosFaltantes} pasos para completar tu solicitud y enviarla a WORCAP.`,
      cta: { label: "Continuar onboarding", href: "/cliente/onboarding" },
    }
  }

  // CASO 3: Sin legajo activo
  if (!activeApp) {
    return {
      tone: "action",
      icon: FileText,
      title: "Todo listo para pedir tu crédito",
      description:
        "Ya tenés el perfil de tu empresa completo. Podés iniciar una nueva solicitud cuando quieras.",
      cta: { label: "Nueva solicitud", href: "/cliente/solicitud/nueva" },
    }
  }

  // Desde acá hay legajo activo: el mensaje depende del estado
  const bucket = getStatusBucket(activeApp.status)
  const legajoStr = activeApp.application_number ?? "Legajo"
  const isFgplus = activeApp.funding_line === "fgplus"

  // CASO 4: Borrador
  if (bucket === "draft") {
    return {
      tone: "info",
      icon: FileText,
      title: `Tu ${legajoStr} está en borrador`,
      description:
        "Para enviarlo a WORCAP, volvé al onboarding y completá el último paso.",
      cta: { label: "Volver al onboarding", href: "/cliente/onboarding" },
    }
  }

  // CASO 5: Pendiente de recepción (recién enviada)
  if (bucket === "pending_review") {
    return {
      tone: "info",
      icon: Inbox,
      title: `Tu ${legajoStr} está en revisión`,
      description:
        "Recibimos tu solicitud y un oficial va a empezar a revisar tu documentación. Te avisamos si necesitamos algo más.",
      cta: { label: "Ver detalle", href: "/cliente/solicitud" },
    }
  }

  // CASO 6: En análisis inicial
  if (bucket === "in_analysis") {
    return {
      tone: "info",
      icon: FileSearch,
      title: `Estamos analizando tu ${legajoStr}`,
      description:
        "Un analista de WORCAP está revisando tu documentación. Te avisaremos cuando necesitemos algo más o cuando esté listo el siguiente paso.",
      cta: { label: "Ver detalle", href: "/cliente/solicitud" },
    }
  }

  // CASO 7: Docs requeridos adicionales (observed durante análisis inicial)
  if (bucket === "docs_requested") {
    return {
      tone: "warning",
      icon: AlertTriangle,
      title: "WORCAP te pidió documentación adicional",
      description:
        "Revisamos tu solicitud y necesitamos info extra para continuar. Entrá al detalle para ver qué falta.",
      cta: { label: "Ver qué falta", href: "/cliente/solicitud" },
    }
  }

  // CASO 8: Análisis inicial OK — elegir línea
  // DEPRECADO. Legacy.
  if (bucket === "awaiting_funding_line_choice") {
    return {
      tone: "action",
      icon: GitBranch,
      title: "¡Elegí tu línea de fondeo!",
      description:
        "Tu documentación inicial fue aprobada. Ahora elegí la línea que mejor se ajuste a tu empresa para continuar.",
      cta: { label: "Elegir línea", href: "/cliente/eleccion-linea" },
      secondaryCta: { label: "Ver detalle", href: "/cliente/solicitud" },
    }
  }

  // CASO 9: PEDIDO DE INFORMACIÓN PENDIENTE
  // Bifurca según línea:
  //   - FGPlus: va a la nueva página índice con las 3 tarjetas
  //   - FG: va al flujo viejo simple de documentos sueltos
  if (bucket === "additional_docs_pending") {
    if (isFgplus) {
      return {
        tone: "warning",
        icon: Mail,
        title: "Tenés un pedido de información pendiente",
        description:
          "WORCAP te pide 3 cosas para avanzar con tu análisis: la composición de cartera, la política de originación y el detalle de tu política de cobranza.",
        cta: {
          label: "Ir al pedido de información",
          href: "/cliente/pedido-informacion",
        },
        secondaryCta: { label: "Ver detalle", href: "/cliente/solicitud" },
      }
    }

    // Financiamiento General: flujo simple
    const count = additionalDocsPending
    const description = count === 1
      ? "Te falta 1 documento específico de la línea que elegiste para que podamos continuar con el análisis."
      : count > 1
      ? `Te faltan ${count} documentos específicos de la línea que elegiste para que podamos continuar con el análisis.`
      : "WORCAP está esperando la documentación específica de tu línea para continuar."
    return {
      tone: "warning",
      icon: UploadCloud,
      title: "Sumá la documentación de tu línea",
      description,
      cta: { label: "Ir a documentación", href: "/cliente/documentos" },
      secondaryCta: { label: "Ver detalle", href: "/cliente/solicitud" },
    }
  }

  // CASO 10: REVISANDO PEDIDO DE INFORMACIÓN
  // Para FGPlus linkea a la nueva página (el cliente puede ver lo que envió en read-only).
  if (bucket === "additional_docs_review") {
    if (isFgplus) {
      return {
        tone: "info",
        icon: ScanLine,
        title: "Estamos revisando tu pedido de información",
        description:
          "Un analista está revisando lo que enviaste: composición de cartera, política de originación y política de cobranza.",
        cta: {
          label: "Ver lo que enviaste",
          href: "/cliente/pedido-informacion",
        },
      }
    }

    return {
      tone: "info",
      icon: ScanLine,
      title: "Estamos revisando tu documentación adicional",
      description:
        "Un analista está revisando los documentos económico-financieros que enviaste. Si falta algo, te vamos a avisar desde acá.",
      cta: { label: "Ver detalle", href: "/cliente/solicitud" },
    }
  }

  // CASO 11: Análisis crediticio final
  if (bucket === "in_credit_analysis") {
    return {
      tone: "info",
      icon: Users,
      title: `Tu ${legajoStr} está en análisis crediticio`,
      description:
        "El área de riesgo está evaluando tu solicitud. Es el último paso antes de la decisión final.",
      cta: { label: "Ver detalle", href: "/cliente/solicitud" },
    }
  }

  // CASO 12: Aprobada
  if (bucket === "approved") {
    return {
      tone: "success",
      icon: CheckCircle2,
      title: `¡Tu ${legajoStr} fue aprobado!`,
      description:
        "Felicitaciones. Entrá al detalle para ver los términos finales y los próximos pasos.",
      cta: { label: "Ver resultado", href: "/cliente/solicitud" },
    }
  }

  // CASO 13: Rechazada
  if (bucket === "rejected") {
    return {
      tone: "error",
      icon: XCircle,
      title: `Tu ${legajoStr} fue rechazado`,
      description:
        "Lamentablemente no pudimos aprobar esta solicitud. Entrá al detalle para ver los motivos.",
      cta: { label: "Ver motivo", href: "/cliente/solicitud" },
    }
  }

  // CASO 14: Cancelada
  if (bucket === "cancelled") {
    return {
      tone: "neutral",
      icon: Ban,
      title: `Tu ${legajoStr} está cancelado`,
      description:
        "Esta solicitud fue cancelada. Podés iniciar una nueva cuando quieras.",
      cta: { label: "Nueva solicitud", href: "/cliente/solicitud/nueva" },
      secondaryCta: { label: "Ver detalle", href: "/cliente/solicitud" },
    }
  }

  // Fallback
  return {
    tone: "info",
    icon: FileText,
    title: `Hola, ${clientName}`,
    description: "Desde acá gestionás tu solicitud de crédito en WORCAP.",
  }
}
