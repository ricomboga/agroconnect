import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type StatusBadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'teal' | 'purple'

export interface StatusBadgeProps {
  variant: StatusBadgeVariant
  children: ReactNode
}

const classesByVariant: Record<StatusBadgeVariant, string> = {
  green: 'bg-ac-green-light text-ac-green-dark',
  amber: 'bg-ac-amber-light text-ac-amber',
  red: 'bg-ac-red-light text-ac-red',
  blue: 'bg-ac-blue-light text-ac-blue',
  teal: 'bg-ac-teal-light text-ac-teal',
  purple: 'bg-ac-purple-light text-ac-purple',
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-1.5 py-0.5 text-sm font-bold',
        classesByVariant[variant],
      )}
    >
      {children}
    </span>
  )
}
