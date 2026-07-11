'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormSection, Field, FieldGroup, Select, TextInput, ChipSelect } from '@agroconnect/web-ui'
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties'

interface Settings {
  notifications: { newApplication: string; statusChange: string; overdueAlert: string }
  profile: { contactEmail: string; mpesaPaybill: string; licenceNumber: string }
  institutionType: string | null
  operatingCounties: string[]
}

export function SettingsView() {
  const [form, setForm] = useState<Settings | null>(null)

  const { data } = useQuery({
    queryKey: ['lender', 'settings'],
    queryFn: async () => {
      const res = await fetch('/api/lender/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const body = (await res.json()) as { data: Settings }
      return body.data
    },
  })

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/lender/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      return res.json()
    },
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save settings'),
  })

  if (!form) {
    return <p className="py-6 text-center text-sm text-muted">Loading…</p>
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Settings</p>
        <p className="mt-0.5 text-sm text-muted">Notification preferences and institution profile</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-base border border-border bg-white p-4">
          <FormSection title="Notification Preferences">
            <Field label="New Application">
              <Select
                value={form.notifications.newApplication}
                onChange={(e) => setForm({ ...form, notifications: { ...form.notifications, newApplication: e.target.value } })}
              >
                <option value="email">Email only</option>
                <option value="sms">SMS only</option>
                <option value="sms_and_email">SMS + Email</option>
                <option value="none">None</option>
              </Select>
            </Field>
            <Field label="Status Change">
              <Select
                value={form.notifications.statusChange}
                onChange={(e) => setForm({ ...form, notifications: { ...form.notifications, statusChange: e.target.value } })}
              >
                <option value="email">Email only</option>
                <option value="sms">SMS only</option>
                <option value="sms_and_email">SMS + Email</option>
                <option value="none">None</option>
              </Select>
            </Field>
            <Field label="Overdue Alert">
              <Select
                value={form.notifications.overdueAlert}
                onChange={(e) => setForm({ ...form, notifications: { ...form.notifications, overdueAlert: e.target.value } })}
              >
                <option value="email">Email only</option>
                <option value="sms">SMS only</option>
                <option value="sms_and_email">SMS + Email</option>
                <option value="none">None</option>
              </Select>
            </Field>
          </FormSection>
        </div>

        <div className="rounded-base border border-border bg-white p-4">
          <FormSection title="Institution Profile">
            <FieldGroup cols={2}>
              <Field label="Contact Email">
                <TextInput
                  type="email"
                  value={form.profile.contactEmail}
                  onChange={(e) => setForm({ ...form, profile: { ...form.profile, contactEmail: e.target.value } })}
                />
              </Field>
              <Field label="M-Pesa Paybill">
                <TextInput
                  value={form.profile.mpesaPaybill}
                  onChange={(e) => setForm({ ...form, profile: { ...form.profile, mpesaPaybill: e.target.value } })}
                />
              </Field>
            </FieldGroup>
            <Field label="Licence / Registration Number">
              <TextInput
                value={form.profile.licenceNumber}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, licenceNumber: e.target.value } })}
              />
            </Field>
          </FormSection>
        </div>
      </div>

      {form.institutionType === 'ngo_grant' && (
        <div className="mt-3.5 rounded-base border border-border bg-white p-4">
          <FormSection title="Operating Areas">
            <Field
              label="Counties your organisation operates in"
              hint="Determines which farmers appear in your Farmer Reports, General Reports, Input Distribution and Dashboard — every farmer with a farm in these counties."
            >
              <ChipSelect
                multiple
                options={KENYA_COUNTIES.map((c) => ({ value: c, label: c }))}
                value={form.operatingCounties}
                onChange={(counties) => setForm({ ...form, operatingCounties: counties })}
              />
            </Field>
          </FormSection>
        </div>
      )}

      <div className="mt-3.5">
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="rounded-md bg-ac-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          💾 Save Settings
        </button>
      </div>
    </div>
  )
}
