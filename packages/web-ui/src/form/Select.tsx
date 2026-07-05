import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

const baseSelectClasses =
  'w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base text-ink ' +
  'focus:border-ac-green focus:shadow-[0_0_0_3px_theme(colors.ac-green.light)] focus:outline-none'

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cn(baseSelectClasses, className)} {...props} />
})
