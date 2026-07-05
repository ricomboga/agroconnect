import type { ReactNode } from 'react'

export interface PageLayoutProps {
  topBar: ReactNode
  sidebar: ReactNode
  children: ReactNode
}

export function PageLayout({ topBar, sidebar, children }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {topBar}
      <div className="flex flex-1 flex-row">
        {sidebar}
        <main className="flex-1 bg-white px-4 py-3.5">{children}</main>
      </div>
    </div>
  )
}
