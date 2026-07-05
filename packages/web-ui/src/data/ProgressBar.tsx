import { cn } from '../lib/cn'

export type ProgressBarColor = 'green' | 'amber' | 'red'

export interface ProgressBarProps {
  value: number
  color: ProgressBarColor
}

const fillByColor: Record<ProgressBarColor, string> = {
  green: 'bg-ac-green',
  amber: 'bg-ac-amber',
  red: 'bg-ac-red',
}

export function ProgressBar({ value, color }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-[3px] bg-border"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-[3px] transition-all', fillByColor[color])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
