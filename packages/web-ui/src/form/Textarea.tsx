import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

const baseTextareaClasses =
  'w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base text-ink ' +
  'placeholder:text-muted focus:border-ac-green focus:shadow-[0_0_0_3px_theme(colors.ac-green.light)] focus:outline-none'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(baseTextareaClasses, className)} {...props} />
})
