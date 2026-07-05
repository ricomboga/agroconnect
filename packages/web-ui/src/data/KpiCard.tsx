import { cn } from '../lib/cn'

export type KpiCardVariant = 'green' | 'gold' | 'teal' | 'red' | 'amber' | 'purple' | 'blue'

export interface KpiCardDelta {
  direction: 'up' | 'down'
  text: string
}

export interface KpiCardProps {
  variant: KpiCardVariant
  value: string | number
  label: string
  delta?: KpiCardDelta
}

const borderByVariant: Record<KpiCardVariant, string> = {
  green: 'border-l-green',
  gold: 'border-l-gold',
  teal: 'border-l-teal',
  red: 'border-l-red',
  amber: 'border-l-amber',
  purple: 'border-l-purple',
  blue: 'border-l-blue',
}

export function KpiCard({ variant, value, label, delta }: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-base border border-border bg-white p-2.5 shadow-card',
        'border-l-[3px]',
        borderByVariant[variant],
      )}
    >
      <div className="text-5xl font-bold text-ink">{value}</div>
      <div className="mt-1 text-md text-muted">{label}</div>
      {delta && (
        <div
          className={cn(
            'mt-1 text-sm font-semibold',
            delta.direction === 'up' ? 'text-ac-green' : 'text-ac-red',
          )}
        >
          {delta.direction === 'up' ? '▲' : '▼'} {delta.text}
        </div>
      )}
    </div>
  )
}
