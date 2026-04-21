/**
 * Anillo de progreso SVG con porcentaje centrado.
 *
 * Usa trazo punteado (stroke-dasharray + stroke-dashoffset) para animar el
 * avance del arco sin depender de librerías de charting. Totalmente
 * responsive: el tamaño se controla con la prop `size`.
 *
 * Ejemplo:
 *   <ProgressRing value={3} total={5} label="Onboarding" />
 */

type Props = {
  value: number
  total: number
  label?: string
  sublabel?: string
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
}

export function ProgressRing({
  value,
  total,
  label,
  sublabel,
  size = 140,
  strokeWidth = 10,
  color = "#1b38e8",
  trackColor = "#e5e7eb",
}: Props) {
  const safeTotal = Math.max(total, 1)
  const clampedValue = Math.max(0, Math.min(value, safeTotal))
  const pct = Math.round((clampedValue / safeTotal) * 100)

  // Cálculo del arco
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          {/* Track de fondo */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Arco de progreso */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 0.6s ease-out",
            }}
          />
        </svg>

        {/* Texto centrado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <span
            className="text-xl font-bold tabular-nums leading-none"
            style={{ color }}
          >
            {pct}%
          </span>
          {sublabel && (
            <span className="text-[11px] text-gray-500 mt-1.5 tabular-nums text-center leading-tight">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {label && (
        <p className="text-sm font-medium text-gray-700 text-center">{label}</p>
      )}
    </div>
  )
}
