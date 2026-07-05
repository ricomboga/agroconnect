import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type AlertBoxVariant = 'green' | 'amber' | 'red' | 'blue'

export interface AlertBoxProps {
  variant: AlertBoxVariant
  children: ReactNode
}

const classesByVariant: Record<AlertBoxVariant, string> = {
  green: 'bg-ac-green-light border-l-green text-ac-green-dark',
  amber: 'bg-ac-amber-light border-l-amber text-ac-amber',
  red: 'bg-ac-red-light border-l-red text-ac-red',
  blue: 'bg-ac-blue-light border-l-blue text-ac-blue',
}

export function AlertBox({ variant, children }: AlertBoxProps) {
  return (
    <div
      className={cn(
        'rounded-r-sm border-l-[3px] px-2.5 py-1.5 text-sm leading-[1.6]',
        classesByVariant[variant],
      )}
    >
      {children}
    </div>
  )
}
