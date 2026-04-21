"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowRight } from "lucide-react"
import { chooseFundingLineAction } from "@/lib/actions/funding-line"
import type { FundingLine } from "@/lib/constants/roles"

type Props = {
  applicationId: string
  line: FundingLine
  label: string
}

export function ChooseFundingLineButton({ applicationId, line, label }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    const result = await chooseFundingLineAction({
      application_id: applicationId,
      funding_line: line,
    })
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push("/cliente/documentos")
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1b38e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
          </>
        ) : (
          <>
            {label}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-600 text-center">{error}</p>}
    </div>
  )
}
