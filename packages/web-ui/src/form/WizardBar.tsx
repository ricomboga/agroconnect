import { cn } from '../lib/cn'

export interface WizardBarProps {
  steps: string[]
  currentStep: number
}

export function WizardBar({ steps, currentStep }: WizardBarProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep

        return (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex-1 rounded-md px-2.5 py-1.5 text-center text-sm font-semibold',
                isActive && 'bg-ac-green text-white',
                isDone && !isActive && 'bg-ac-green-light text-ac-green',
                !isDone && !isActive && 'bg-surface2 text-muted',
              )}
            >
              {step}
            </div>
            {i < steps.length - 1 && <span className="text-muted2">›</span>}
          </div>
        )
      })}
    </div>
  )
}
