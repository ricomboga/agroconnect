import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface SidebarNavItem {
  label: string
  href: string
  active?: boolean
  badge?: number | string
}

export interface SidebarSection {
  title: string
  items: SidebarNavItem[]
}

export interface SidebarProps {
  sections: SidebarSection[]
}

export function Sidebar({ sections }: SidebarProps): ReactNode {
  return (
    <aside className="w-[200px] shrink-0 border-r border-border bg-white px-2.5 py-3">
      {sections.map((section) => (
        <div key={section.title} className="mb-4">
          <div className="mb-1.5 mt-2.5 text-sm font-bold uppercase tracking-wide text-ac-green">
            {section.title}
          </div>

          <nav className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between rounded-sm px-2.5 py-1.5 text-md',
                  item.active
                    ? 'bg-ac-green-light font-semibold text-ac-green'
                    : 'text-ink2 hover:bg-surface2',
                )}
              >
                <span>{item.label}</span>
                {item.badge != null && (
                  <span className="min-w-[16px] rounded-pill bg-ac-red px-1 text-center text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  )
}
