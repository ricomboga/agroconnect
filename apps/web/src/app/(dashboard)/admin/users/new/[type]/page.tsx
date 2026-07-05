'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { FormSection, Field, FieldGroup, TextInput, Select, ChipSelect } from '@agroconnect/web-ui'
import { ROLE_FORM_CONFIG, type FieldConfig } from '../_data/roleFormConfig'

interface Farm {
  id: string
  name: string
  ownerId: string
}

const PHONE_RE = /^(\+2547\d{8}|07\d{8})$/

function initialValues(fields: FieldConfig[]): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {}
  for (const f of fields) {
    values[f.key] = f.default ?? (f.type === 'chips' && f.multiple ? [] : '')
  }
  return values
}

export default function CreateRoleUserPage() {
  const router = useRouter()
  const params = useParams<{ type: string }>()
  const config = ROLE_FORM_CONFIG[params.type]

  const allFields = useMemo(() => config?.sections.flatMap((s) => s.fields) ?? [], [config])
  const [values, setValues] = useState<Record<string, string | string[]>>(() =>
    initialValues(allFields),
  )
  const [farms, setFarms] = useState<Farm[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params.type !== 'worker') return
    fetch('/api/farm/farms')
      .then((r) => r.json())
      .then((body) => setFarms(body.data ?? []))
      .catch(() => setFarms([]))
  }, [params.type])

  if (!config) {
    return <p className="text-sm text-ac-red">Unknown role type: {params.type}</p>
  }

  function setValue(key: string, v: string | string[]) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  function findCounty(): string | undefined {
    const countyKey = allFields.find((f) => /county$/i.test(f.key))?.key
    if (!countyKey) return undefined
    const v = values[countyKey]
    return typeof v === 'string' ? v || undefined : undefined
  }

  function validate(): boolean {
    for (const f of allFields) {
      if (!f.required) continue
      const v = values[f.key]
      const empty = Array.isArray(v) ? v.length === 0 : !v?.trim()
      if (empty) {
        toast.error(`${f.label} is required`)
        return false
      }
    }
    const phone = values['phone']
    if (typeof phone === 'string' && !PHONE_RE.test(phone.trim())) {
      toast.error('Use +254XXXXXXXXX or 07XXXXXXXX for phone')
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const fullName = String(values['fullName'] ?? '')
      const phone = String(values['phone'] ?? '')

      const userRes = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password: 'Agro1234',
          fullName: fullName.trim(),
          role: config.apiRole,
          county: findCounty(),
          email: values['email'] ? String(values['email']) : undefined,
        }),
      })
      const userBody = await userRes.json()
      if (!userRes.ok) throw new Error(userBody?.message ?? 'Failed to create account')
      const userId: string = userBody.data?.id ?? userBody.id
      if (!userId) throw new Error('User creation did not return an id')

      if (params.type === 'worker') {
        const farmId = String(values['farmId'] ?? '')
        if (!farmId) throw new Error('Please select a farm to assign the worker to')
        const workerRes = await fetch(`/api/farm/farms/${farmId}/workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            role: String(values['workerRole'] || 'field_worker'),
          }),
        })
        if (!workerRes.ok) {
          const workerBody = await workerRes.json().catch(() => ({}))
          throw new Error(workerBody?.message_key ?? 'Failed to assign worker to farm')
        }
      }

      toast.success(`${fullName}'s account created. SMS sent to ${phone}.`)
      router.push(`/admin/users/new/success?role=${encodeURIComponent(config.title)}&userId=${userId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="mb-3 text-lg font-bold text-ink">{config.title}</h1>
      <div className="rounded-base border border-border bg-white p-4">
        {config.sections.map((section) => (
          <FormSection key={section.title} title={section.title}>
            <FieldGroup cols={2}>
              {section.fields.map((f) => (
                <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
                  {f.type === 'select' ? (
                    <Select
                      value={values[f.key] as string}
                      onChange={(e) => setValue(f.key, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(f.key === 'farmId' ? farms.map((fm) => ({ value: fm.id, label: fm.name })) : f.options ?? []).map(
                        (opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ),
                      )}
                    </Select>
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
              ))}
            </FieldGroup>
          </FormSection>
        ))}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/users/new')}
            className="rounded-md border border-border px-3.5 py-2 text-base font-semibold text-muted"
          >
            ← Back
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : `✅ ${config.title}`}
          </button>
        </div>
      </div>
    </div>
  )
}
