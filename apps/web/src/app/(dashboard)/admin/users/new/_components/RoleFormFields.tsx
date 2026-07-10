'use client'

import { FormSection, Field, FieldGroup, TextInput, Select, ChipSelect } from '@agroconnect/web-ui'
import { SUB_COUNTIES_BY_COUNTY } from '../_data/subCounties'
import { getRegionForCounty, type KenyaCounty } from '@agroconnect/shared/constants/counties'
import type { SectionConfig } from '../_data/roleFormConfig'

interface Farm {
  id: string
  name: string
}

interface Props {
  sections: SectionConfig[]
  values: Record<string, string | string[]>
  setValue: (key: string, v: string | string[]) => void
  farms?: Farm[]
}

export function RoleFormFields({ sections, values, setValue, farms = [] }: Props) {
  return (
    <>
      {sections.map((section) => (
        <FormSection key={section.title} title={section.title}>
          <FieldGroup cols={2}>
            {section.fields.map((f) => {
              const countyValue = f.countyKey ? (values[f.countyKey] as string) : ''
              return (
                <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
                  {f.type === 'select' ? (
                    <Select value={values[f.key] as string} onChange={(e) => setValue(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {(f.key === 'farmId' ? farms.map((fm) => ({ value: fm.id, label: fm.name })) : f.options ?? []).map(
                        (opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ),
                      )}
                    </Select>
                  ) : f.type === 'subcounty' ? (
                    <>
                      <Select
                        value={values[f.key] as string}
                        onChange={(e) => setValue(f.key, e.target.value)}
                        disabled={!countyValue}
                      >
                        <option value="">{countyValue ? 'Select…' : 'Select a county first'}</option>
                        {(SUB_COUNTIES_BY_COUNTY[countyValue as KenyaCounty] ?? []).map((sc) => (
                          <option key={sc} value={sc}>
                            {sc}
                          </option>
                        ))}
                      </Select>
                      {countyValue && (
                        <p className="mt-1 text-xs text-muted">
                          Region: {getRegionForCounty(countyValue) ?? '—'}
                        </p>
                      )}
                    </>
                  ) : f.type === 'chips' ? (
                    <ChipSelect
                      options={f.options ?? []}
                      multiple
                      value={(values[f.key] as string[]) ?? []}
                      onChange={(v) => setValue(f.key, v)}
                    />
                  ) : (
                    <TextInput
                      type={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={values[f.key] as string}
                      onChange={(e) => setValue(f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  )}
                </Field>
              )
            })}
          </FieldGroup>
        </FormSection>
      ))}
    </>
  )
}
