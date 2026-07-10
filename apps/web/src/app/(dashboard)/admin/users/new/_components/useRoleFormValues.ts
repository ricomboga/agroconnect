import { useState } from 'react'
import type { FieldConfig } from '../_data/roleFormConfig'

export function initialValues(fields: FieldConfig[]): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {}
  for (const f of fields) {
    values[f.key] = f.default ?? (f.type === 'chips' && f.multiple ? [] : '')
  }
  return values
}

/**
 * Tracks form field values and clears a paired 'subcounty' field whenever its
 * source county field changes, since the sub-county options (and any
 * previously chosen value) no longer apply to the newly selected county.
 */
export function useRoleFormValues(fields: FieldConfig[], initial?: Record<string, string | string[]>) {
  const [values, setValues] = useState<Record<string, string | string[]>>(
    () => initial ?? initialValues(fields),
  )

  function setValue(key: string, v: string | string[]) {
    setValues((prev) => {
      const next = { ...prev, [key]: v }
      for (const f of fields) {
        if (f.type === 'subcounty' && f.countyKey === key) {
          next[f.key] = ''
        }
      }
      return next
    })
  }

  return { values, setValues, setValue }
}
