import type { ReactNode } from 'react'

export interface ListRowProps {
  avatar?: ReactNode
  title: string
  sub?: string
  action?: ReactNode
}

export function ListRow({ avatar, title, sub, action }: ListRowProps) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border py-2">
      {avatar}
      <div className="flex-1">
        <div className="text-base font-bold text-ink">{title}</div>
        {sub && <div className="text-sm text-muted">{sub}</div>}
      </div>
      {action}
    </div>
  )
}
