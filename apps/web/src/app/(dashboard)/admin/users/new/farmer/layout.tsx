'use client'

import { usePathname } from 'next/navigation'
import { WizardBar } from '@agroconnect/web-ui'
import { FarmerCreationProvider } from '../_context/FarmerCreationContext'

const STEPS = ['User Type', 'Personal Info', 'Sub-type', 'Farm Setup', 'Assignments', 'Review']

function currentStepFromPathname(pathname: string): number {
  const match = pathname.match(/\/farmer\/(\d)/)
  if (!match) return STEPS.length
  return Number(match[1]) - 1
}

export default function FarmerWizardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentStep = currentStepFromPathname(pathname)

  return (
    <FarmerCreationProvider>
      <div>
        <h1 className="mb-3 text-lg font-bold text-ink">Create Farmer Account</h1>
        {currentStep < STEPS.length && (
          <div className="mb-4">
            <WizardBar steps={STEPS} currentStep={currentStep} />
          </div>
        )}
        <div className="rounded-base border border-border bg-white p-4">{children}</div>
      </div>
    </FarmerCreationProvider>
  )
}
