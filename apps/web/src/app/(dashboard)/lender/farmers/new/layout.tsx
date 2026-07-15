'use client'

import { usePathname } from 'next/navigation'
import { WizardBar } from '@agroconnect/web-ui'
import { NgoFarmerCreationProvider } from './_context/NgoFarmerCreationContext'

const STEPS = ['Personal Info', 'Farm Type', 'Farm Setup', 'Review']

function currentStepFromPathname(pathname: string): number {
  if (pathname === '/lender/farmers/new') return 0
  const match = pathname.match(/\/farmers\/new\/(\d)/)
  const step = match ? Number(match[1]) : NaN
  if (step >= 2 && step <= 4) return step - 1
  return STEPS.length
}

export default function NgoFarmerWizardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentStep = currentStepFromPathname(pathname)

  return (
    <NgoFarmerCreationProvider>
      <div>
        <h1 className="mb-3 text-lg font-bold text-ink">Add Farmer</h1>
        {currentStep < STEPS.length && (
          <div className="mb-4">
            <WizardBar steps={STEPS} currentStep={currentStep} />
          </div>
        )}
        <div className="rounded-base border border-border bg-white p-4">{children}</div>
      </div>
    </NgoFarmerCreationProvider>
  )
}
