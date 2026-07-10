'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ROLE_FORM_CONFIG } from '../_data/roleFormConfig'
import { EXPERT_TYPE_TO_PROVIDER_TYPE } from '../_data/expertTypeMap'
import { RoleFormFields } from '../_components/RoleFormFields'
import { useRoleFormValues } from '../_components/useRoleFormValues'

interface Farm {
  id: string
  name: string
  ownerId: string
}

const PHONE_RE = /^(\+2547\d{8}|07\d{8})$/

export default function CreateRoleUserPage() {
  const router = useRouter()
  const params = useParams<{ type: string }>()
  const config = ROLE_FORM_CONFIG[params.type]

  const allFields = useMemo(() => config?.sections.flatMap((s) => s.fields) ?? [], [config])
  const { values, setValue } = useRoleFormValues(allFields)
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

  function findCounty(): string | undefined {
    const countyKey = allFields.find((f) => /county$/i.test(f.key) && f.type === 'select')?.key
    if (!countyKey) return undefined
    const v = values[countyKey]
    return typeof v === 'string' ? v || undefined : undefined
  }

  function findSubCounty(): string | undefined {
    const subCountyKey = allFields.find((f) => f.type === 'subcounty')?.key
    if (!subCountyKey) return undefined
    const v = values[subCountyKey]
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
      const county = findCounty()
      const subCounty = findSubCounty()

      let partnerBankId: string | undefined
      if (params.type === 'lender') {
        const partnerRes = await fetch('/api/finance/internal/loan-partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: String(values['institutionName'] ?? ''),
            type: String(values['institutionType'] ?? 'bank'),
            licenceNo: values['licenceNo'] ? String(values['licenceNo']) : undefined,
            paybill: values['paybill'] ? String(values['paybill']) : undefined,
            headOfficeCounty: county,
            headOfficeSubCounty: subCounty,
            maxLoanKes: values['maxLoanKes'] ? Number(values['maxLoanKes']) : undefined,
            interestRateAnnual: values['interestRate'] ? Number(values['interestRate']) : undefined,
          }),
        })
        const partnerBody = await partnerRes.json()
        if (!partnerRes.ok) throw new Error(partnerBody?.message ?? 'Failed to create institution record')
        partnerBankId = partnerBody.data?.id
      }

      const userRes = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          password: 'Agro1234',
          fullName: fullName.trim(),
          role: config.apiRole,
          county,
          subCounty,
          email: values['email'] ? String(values['email']) : undefined,
          partnerBankId,
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

      if (params.type === 'vet_officer') {
        const expertType = String(values['expertType'] ?? '')
        const providerType = EXPERT_TYPE_TO_PROVIDER_TYPE[expertType]
        const specialisations = (values['specialisations'] as string[] | undefined) ?? []
        try {
          const expertRes = await fetch('/api/community/internal/experts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              name: fullName.trim(),
              providerType,
              specialisations: specialisations.length ? specialisations : ['general'],
              countiesServed: county ? [county] : [],
              subCountiesServed: subCounty ? [subCounty] : [],
              organisation: values['organisation'] ? String(values['organisation']) : undefined,
              licenceNumber: values['licenceNumber'] ? String(values['licenceNumber']) : undefined,
              maxFarmers: values['maxFarmers'] ? Number(values['maxFarmers']) : undefined,
              phone: phone.trim(),
            }),
          })
          if (!expertRes.ok) {
            toast.error('Account created, but adding to the public Find-Help directory failed')
          }
        } catch {
          toast.error('Account created, but adding to the public Find-Help directory failed')
        }
      }

      if (params.type === 'supplier') {
        const businessName = String(values['businessName'] ?? '')
        const categories = (values['productCategories'] as string[] | undefined) ?? []
        try {
          const profileRes = await fetch('/api/market/internal/supplier-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              businessName,
              businessRegNumber: values['businessRegNumber'] ? String(values['businessRegNumber']) : undefined,
              deliveryRadiusKm: values['deliveryRadiusKm'] ? String(values['deliveryRadiusKm']) : undefined,
              county,
              subCounty,
              categories,
              phone: phone.trim(),
              address: values['address'] ? String(values['address']) : undefined,
            }),
          })
          if (!profileRes.ok) {
            toast.error('Account created, but adding to the supplier directory failed')
          }
        } catch {
          toast.error('Account created, but adding to the supplier directory failed')
        }
      }

      if (params.type === 'govt_officer') {
        try {
          const profileRes = await fetch('/api/govt/internal/officer-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              fullName: fullName.trim(),
              phone: phone.trim(),
              ministry: String(values['ministry'] ?? ''),
              position: String(values['position'] ?? ''),
              staffId: String(values['staffId'] ?? ''),
              assignedCounty: county,
              assignedSubCounty: subCounty,
            }),
          })
          if (!profileRes.ok) {
            toast.error('Account created, but saving ministry/position details failed')
          }
        } catch {
          toast.error('Account created, but saving ministry/position details failed')
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
        <RoleFormFields sections={config.sections} values={values} setValue={setValue} farms={farms} />

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
