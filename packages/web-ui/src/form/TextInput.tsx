import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>

const baseInputClasses =
  'w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base text-ink ' +
  'placeholder:text-muted focus:border-ac-green focus:shadow-[0_0_0_3px_theme(colors.ac-green.light)] focus:outline-none'

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(baseInputClasses, className)} {...props} />
})
