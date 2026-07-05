import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface FieldGroupProps {
  cols: 2 | 3 | 4
  children: ReactNode
}

const colsClasses: Record<FieldGroupProps['cols'], string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

export function FieldGroup({ cols, children }: FieldGroupProps) {
  return <div className={cn('grid gap-3', colsClasses[cols])}>{children}</div>
}
