import Link from "next/link"
import { ArrowRight, Check, Circle, Clock, AlertCircle } from "lucide-react"

type CardState = "pending" | "in_progress" | "complete" | "rejected"

type Props = {
  stepNumber: number
  title: string
  description: string
  progressText: string // Ej: "2 de 3 archivos subidos" o "Sin empezar"
  state: CardState
  href: string
  disabled?: boolean // Si es true, el card se ve gris y no se puede clickear
}

const STATE_CONFIG: {
  [K in CardState]: {
    label: string
    icon: typeof Check
    iconColor: string
    bgLabel: string
    textLabel: string
  }
} = {
  pending: {
    label: "Pendiente",
    icon: Circle,
    iconColor: "text-gray-400",
    bgLabel: "bg-gray-100",
    textLabel: "text-gray-600",
  },
  in_progress: {
    label: "En progreso",
    icon: Clock,
    iconColor: "text-amber-500",
    bgLabel: "bg-amber-50",
    textLabel: "text-amber-700",
  },
  complete: {
    label: "Completo",
    icon: Check,
    iconColor: "text-emerald-600",
    bgLabel: "bg-emerald-50",
    textLabel: "text-emerald-700",
  },
  rejected: {
    label: "Con rechazos",
    icon: AlertCircle,
    iconColor: "text-red-500",
    bgLabel: "bg-red-50",
    textLabel: "text-red-700",
  },
}

export function PedidoInfoCard({
  stepNumber,
  title,
  description,
  progressText,
  state,
  href,
  disabled = false,
}: Props) {
  const cfg = STATE_CONFIG[state]
  const Icon = cfg.icon

  const Wrapper = disabled ? "div" : Link

  return (
    <Wrapper
      {...(!disabled && { href })}
      className={`block rounded-xl border transition-colors ${
        disabled
          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
          : "border-gray-200 bg-white hover:border-[#1b38e8] hover:bg-[#f7f9ff] cursor-pointer"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Número del paso + ícono */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className={`h-10 w-10 rounded-full grid place-items-center text-sm font-semibold ${
                state === "complete"
                  ? "bg-emerald-100 text-emerald-700"
                  : state === "in_progress"
                  ? "bg-amber-100 text-amber-700"
                  : state === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-[#eff3ff] text-[#1b38e8]"
              }`}
            >
              {stepNumber}
            </div>
            <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900">
                {title}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bgLabel} ${cfg.textLabel}`}
              >
                {cfg.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
            <p className="mt-2 text-xs text-gray-500">{progressText}</p>
          </div>

          {/* Flecha */}
          {!disabled && (
            <div className="shrink-0 self-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  )
}
