"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"
import { submitApplicationAction } from "@/lib/actions/application"

export function SubmitApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!confirm("¿Enviar el legajo al oficial? Una vez enviado no podrás modificar la documentación libremente.")) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitApplicationAction({ application_id: applicationId })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/cliente/solicitud")
      router.refresh()
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Enviar al oficial
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
