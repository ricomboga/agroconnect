import type { ReactNode } from 'react'

export interface FormSectionProps {
  title: string
  children: ReactNode
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 border-b border-ac-green-light pb-1 text-sm font-bold uppercase tracking-wide text-ac-green">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
