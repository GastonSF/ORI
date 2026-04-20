'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: number
  label: string
}

interface ProgressTrackerProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export function ProgressTracker({ steps, currentStep, onStepClick }: ProgressTrackerProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep
          const isPending = step.id > currentStep

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id)}
                  disabled={isPending}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-[#1B3FD8] text-white cursor-pointer',
                    isCurrent && 'border-2 border-[#1B3FD8] bg-white text-[#1B3FD8]',
                    isPending && 'border-2 border-[#E5E7EB] bg-white text-[#6B7280] cursor-not-allowed'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </button>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center max-w-[80px]',
                    (isCompleted || isCurrent) && 'text-[#1B3FD8]',
                    isPending && 'text-[#6B7280]'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mt-[-1.5rem]',
                    step.id < currentStep ? 'bg-[#1B3FD8]' : 'bg-[#E5E7EB]'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
