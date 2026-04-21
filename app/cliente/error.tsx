"use client"

// Error boundary de /cliente: captura errores del server y los muestra
// en vez del mensaje genérico "This page couldn't load".
// Nos permite diagnosticar bugs más rápido.

import Link from "next/link"
import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error en /cliente:", error)
  }, [error])

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-red-900">Algo falló cargando esta página</h2>
            <p className="mt-1 text-sm text-red-700">
              Acá va el detalle técnico del error. Si persiste, mostralo al equipo.
            </p>

            <div className="mt-4 rounded-md bg-white border border-red-200 p-3">
              <p className="text-xs font-mono text-red-900 whitespace-pre-wrap break-all">
                {error.message || "Error sin mensaje"}
              </p>
              {error.digest && (
                <p className="mt-2 text-xs text-red-700 font-mono">
                  digest: {error.digest}
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => reset()}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
              </button>
              <Link
                href="/cliente"
                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Volver al panel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
