'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FormSection, Field, FieldGroup, TextInput, Select, AlertBox } from '@agroconnect/web-ui'
import { useNgoFarmerCreation } from './_context/NgoFarmerCreationContext'
import { SUB_COUNTIES_BY_COUNTY, type KenyaCounty } from '@agroconnect/shared/constants/counties'

const PHONE_RE = /^(\+2547\d{8}|07\d{8})$/

export default function NgoFarmerStep1Page() {
  const router = useRouter()
  const { state, update } = useNgoFarmerCreation()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [operatingCounties, setOperatingCounties] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/lender/settings')
      .then((r) => r.json())
      .then((body) => setOperatingCounties(body.data?.operatingCounties ?? []))
      .catch(() => setOperatingCounties([]))
  }, [])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (state.fullName.trim().length < 2) errs.fullName = 'Minimum 2 characters'
    if (!PHONE_RE.test(state.phone.trim())) errs.phone = 'Use +254XXXXXXXXX or 07XXXXXXXX'
    if (state.nationalId.trim().length < 5) errs.nationalId = 'Required'
    if (!state.county) errs.county = 'Required'
    if (!state.subCounty.trim()) errs.subCounty = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <div>
      {operatingCounties.length === 0 && (
        <div className="mb-3">
          <AlertBox variant="amber">
            Your organization has no operating counties configured. Set them in Settings before adding
            farmers, so the new farmer appears in your roster and reports.
          </AlertBox>
        </div>
      )}

      <FormSection title="Identity">
        <FieldGroup cols={2}>
          <Field label="Full Name" required>
            <TextInput
              value={state.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
              placeholder="Jane Wanjiru"
            />
            {errors.fullName && <p className="mt-1 text-xs text-ac-red">{errors.fullName}</p>}
          </Field>
          <Field label="Phone Number" required hint="Valid M-Pesa line. PIN will be sent here via SMS.">
            <TextInput
              value={state.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+254712345678"
            />
            {errors.phone && <p className="mt-1 text-xs text-ac-red">{errors.phone}</p>}
          </Field>
          <Field label="National ID Number" required>
            <TextInput
              value={state.nationalId}
              onChange={(e) => update({ nationalId: e.target.value })}
              placeholder="12345678"
            />
            {errors.nationalId && <p className="mt-1 text-xs text-ac-red">{errors.nationalId}</p>}
          </Field>
          <Field label="Gender">
            <Select value={state.gender} onChange={(e) => update({ gender: e.target.value })}>
              <option value="">Select…</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
          </Field>
          <Field label="Date of Birth">
            <TextInput type="date" value={state.dob} onChange={(e) => update({ dob: e.target.value })} />
          </Field>
        </FieldGroup>
      </FormSection>

      <FormSection title="Location">
        <FieldGroup cols={2}>
          <Field
            label="County"
            required
            hint={operatingCounties.length > 0 ? 'Restricted to your organization’s operating counties' : undefined}
          >
            <Select value={state.county} onChange={(e) => update({ county: e.target.value, subCounty: '' })}>
              <option value="">Select county…</option>
              {operatingCounties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {errors.county && <p className="mt-1 text-xs text-ac-red">{errors.county}</p>}
          </Field>
          <Field label="Sub-county" required>
            <Select
              value={state.subCounty}
              onChange={(e) => update({ subCounty: e.target.value })}
              disabled={!state.county}
            >
              <option value="">{state.county ? 'Select sub-county…' : 'Select a county first'}</option>
              {(SUB_COUNTIES_BY_COUNTY[state.county as KenyaCounty] ?? []).map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </Select>
            {errors.subCounty && <p className="mt-1 text-xs text-ac-red">{errors.subCounty}</p>}
          </Field>
          <Field label="Village / Ward">
            <TextInput value={state.village} onChange={(e) => update({ village: e.target.value })} />
          </Field>
          <Field label="Nearest Town / Market">
            <TextInput value={state.nearestTown} onChange={(e) => update({ nearestTown: e.target.value })} />
          </Field>
        </FieldGroup>
      </FormSection>

      <FormSection title="Platform Access">
        <Field label="Preferred Language">
          <Select value={state.language} onChange={(e) => update({ language: e.target.value })}>
            <option value="sw">Kiswahili</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <AlertBox variant="green">
          A temporary PIN (1234) will be sent via SMS. The farmer must change it on first login.
        </AlertBox>
      </FormSection>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (validate()) router.push('/lender/farmers/new/2')
          }}
          className="rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white"
        >
          Next: Farm Type →
        </button>
      </div>
    </div>
  )
}
