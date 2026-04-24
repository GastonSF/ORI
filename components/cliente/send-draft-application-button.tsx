"use client"

import { useTransition } from "react"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { completeOnboardingAction } from "@/lib/actions/client"

export function SendDraftApplicationButton() {
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await completeOnboardingAction()
      if (result && !result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Tu solicitud fue enviada a WORCAP")
    })
  }

  return (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md bg-[#1b38e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1730c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando...
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          Enviar mi solicitud
        </>
      )}
    </button>
  )
}
