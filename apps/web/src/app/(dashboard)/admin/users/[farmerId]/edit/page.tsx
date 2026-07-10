'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ROLE_FORM_CONFIG, ROLE_TO_TYPE, type FieldConfig } from '../../new/_data/roleFormConfig'
import { EXPERT_TYPE_TO_PROVIDER_TYPE, PROVIDER_TYPE_TO_EXPERT_TYPE } from '../../new/_data/expertTypeMap'
import { RoleFormFields } from '../../new/_components/RoleFormFields'
import { useRoleFormValues, initialValues } from '../../new/_components/useRoleFormValues'

interface AdminUser {
  id: string
  full_name: string
  phone: string
  email: string | null
  role: string
  county: string
  sub_county?: string
  partner_bank_id?: string | null
}

interface Expert {
  id: string
  providerType: string
  specialisations: string[]
  countiesServed: string[]
  subCountiesServed: string[]
  organisation: string | null
  licenceNumber: string | null
  maxFarmers: number | null
  phone: string
}

interface SupplierProfile {
  id: string
  businessName: string
  businessRegNumber: string | null
  deliveryRadiusKm: string | null
  county: string
  subCounty: string | null
  categories: string[]
  phone: string
  address: string | null
}

interface LoanPartner {
  id: string
  name: string
  type: string
  licenceNo: string | null
  paybill: string | null
  headOfficeCounty: string | null
  headOfficeSubCounty: string | null
  maxLoanKes: number
  interestRateAnnual: number
}

interface OfficerProfile {
  id: string
  ministry: string
  position: string
  staffId: string
  assignedCounty: string
  assignedSubCounty: string | null
}

interface PageProps {
  params: Promise<{ farmerId: string }>
}

function countyKeyOf(fields: FieldConfig[]): string | undefined {
  return fields.find((f) => f.type === 'select' && /county$/i.test(f.key))?.key
}
function subCountyKeyOf(fields: FieldConfig[]): string | undefined {
  return fields.find((f) => f.type === 'subcounty')?.key
}

export default function EditRoleUserPage({ params }: PageProps) {
  const { farmerId } = use(params)
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [expertId, setExpertId] = useState<string | undefined>()
  const [officerProfileId, setOfficerProfileId] = useState<string | undefined>()
  const [prefilled, setPrefilled] = useState(false)

  const userQuery = useQuery({
    queryKey: ['admin', 'user', farmerId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${farmerId}`)
      if (!res.ok) throw new Error('User not found')
      const body = (await res.json()) as { data: AdminUser }
      return body.data
    },
  })

  const type = userQuery.data ? ROLE_TO_TYPE[userQuery.data.role] : undefined
  const config = type ? ROLE_FORM_CONFIG[type] : undefined
  const allFields = config?.sections.flatMap((s) => s.fields) ?? []

  const needsProfile = type === 'vet_officer' || type === 'supplier' || type === 'lender' || type === 'govt_officer'
  const profileQuery = useQuery({
    queryKey: ['admin', 'user-profile', farmerId, type],
    enabled: !!type && needsProfile && !!userQuery.data,
    queryFn: async () => {
      if (type === 'vet_officer') {
        const res = await fetch(`/api/community/internal/experts/by-user/${farmerId}`)
        if (!res.ok) return null
        const body = (await res.json()) as { data: Expert }
        return body.data
      }
      if (type === 'lender') {
        const partnerBankId = userQuery.data?.partner_bank_id
        if (!partnerBankId) return null
        const res = await fetch(`/api/finance/internal/loan-partners/${partnerBankId}`)
        if (!res.ok) return null
        const body = (await res.json()) as { data: LoanPartner }
        return body.data
      }
      if (type === 'govt_officer') {
        const res = await fetch(`/api/govt/internal/officer-profiles/by-user/${farmerId}`)
        if (!res.ok) return null
        const body = (await res.json()) as { data: OfficerProfile }
        return body.data
      }
      const res = await fetch(`/api/market/internal/supplier-profiles?userId=${farmerId}`)
      if (!res.ok) return null
      const body = (await res.json()) as { data: SupplierProfile[] }
      return body.data[0] ?? null
    },
  })

  const { values, setValues, setValue } = useRoleFormValues(allFields)

  useEffect(() => {
    if (prefilled || !userQuery.data || !config) return
    if (needsProfile && profileQuery.isLoading) return

    const u = userQuery.data
    const next = initialValues(allFields)
    for (const f of allFields) {
      if (f.key === 'fullName') next[f.key] = u.full_name
      else if (f.key === 'phone') next[f.key] = u.phone
      else if (f.key === 'email') next[f.key] = u.email ?? ''
      else if (f.type === 'select' && /county$/i.test(f.key)) next[f.key] = u.county ?? ''
      else if (f.type === 'subcounty') next[f.key] = u.sub_county ?? ''
    }

    if (type === 'vet_officer' && profileQuery.data) {
      const e = profileQuery.data as Expert
      setExpertId(e.id)
      next['expertType'] = PROVIDER_TYPE_TO_EXPERT_TYPE[e.providerType] ?? e.providerType
      next['specialisations'] = e.specialisations
      next['organisation'] = e.organisation ?? ''
      next['licenceNumber'] = e.licenceNumber ?? ''
      next['maxFarmers'] = e.maxFarmers != null ? String(e.maxFarmers) : ''
    }
    if (type === 'supplier' && profileQuery.data) {
      const s = profileQuery.data as SupplierProfile
      next['businessName'] = s.businessName
      next['businessRegNumber'] = s.businessRegNumber ?? ''
      next['deliveryRadiusKm'] = s.deliveryRadiusKm ?? ''
      next['productCategories'] = s.categories
      next['address'] = s.address ?? ''
    }
    if (type === 'lender' && profileQuery.data) {
      const p = profileQuery.data as LoanPartner
      next['institutionName'] = p.name
      next['institutionType'] = p.type
      next['licenceNo'] = p.licenceNo ?? ''
      next['paybill'] = p.paybill ?? ''
      next['maxLoanKes'] = String(p.maxLoanKes ?? '')
      next['interestRate'] = String(p.interestRateAnnual ?? '')
    }
    if (type === 'govt_officer' && profileQuery.data) {
      const o = profileQuery.data as OfficerProfile
      setOfficerProfileId(o.id)
      next['ministry'] = o.ministry
      next['position'] = o.position
      next['staffId'] = o.staffId
    }

    setValues(next)
    setPrefilled(true)
  }, [prefilled, userQuery.data, profileQuery.data, profileQuery.isLoading, needsProfile, config, allFields, type, setValues])

  async function handleSave() {
    if (!config || !userQuery.data) return
    setSubmitting(true)
    try {
      const fullName = String(values['fullName'] ?? '')
      const email = values['email'] ? String(values['email']) : undefined
      const countyKey = countyKeyOf(allFields)
      const county = countyKey ? String(values[countyKey] ?? '') || undefined : undefined
      const subCountyKey = subCountyKeyOf(allFields)
      const subCounty = subCountyKey ? String(values[subCountyKey] ?? '') || undefined : undefined

      const userRes = await fetch(`/api/admin/users/${farmerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', fullName, email, county, subCounty }),
      })
      if (!userRes.ok) {
        const body = await userRes.json().catch(() => ({}))
        throw new Error(body?.message ?? 'Failed to update account')
      }

      if (type === 'vet_officer' && expertId) {
        const expertType = String(values['expertType'] ?? '')
        const providerType = EXPERT_TYPE_TO_PROVIDER_TYPE[expertType]
        const specialisations = (values['specialisations'] as string[] | undefined) ?? []
        const res = await fetch(`/api/community/internal/experts/${expertId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerType,
            specialisations: specialisations.length ? specialisations : ['general'],
            countiesServed: county ? [county] : undefined,
            subCountiesServed: subCounty ? [subCounty] : [],
            organisation: values['organisation'] ? String(values['organisation']) : undefined,
            licenceNumber: values['licenceNumber'] ? String(values['licenceNumber']) : undefined,
            maxFarmers: values['maxFarmers'] ? Number(values['maxFarmers']) : undefined,
            phone: String(values['phone'] ?? '').trim(),
          }),
        })
        if (!res.ok) toast.error('Account updated, but the Find-Help directory entry failed to update')
      }

      if (type === 'supplier') {
        const businessName = String(values['businessName'] ?? '')
        const categories = (values['productCategories'] as string[] | undefined) ?? []
        const res = await fetch('/api/market/internal/supplier-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: farmerId,
            businessName,
            businessRegNumber: values['businessRegNumber'] ? String(values['businessRegNumber']) : undefined,
            deliveryRadiusKm: values['deliveryRadiusKm'] ? String(values['deliveryRadiusKm']) : undefined,
            county,
            subCounty,
            categories,
            phone: String(values['phone'] ?? '').trim(),
            address: values['address'] ? String(values['address']) : undefined,
          }),
        })
        if (!res.ok) toast.error('Account updated, but the supplier directory entry failed to update')
      }

      if (type === 'lender' && userQuery.data.partner_bank_id) {
        const res = await fetch(`/api/finance/internal/loan-partners/${userQuery.data.partner_bank_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values['institutionName'] ? String(values['institutionName']) : undefined,
            type: values['institutionType'] ? String(values['institutionType']) : undefined,
            licenceNo: values['licenceNo'] ? String(values['licenceNo']) : undefined,
            paybill: values['paybill'] ? String(values['paybill']) : undefined,
            headOfficeCounty: county,
            headOfficeSubCounty: subCounty,
            maxLoanKes: values['maxLoanKes'] ? Number(values['maxLoanKes']) : undefined,
            interestRateAnnual: values['interestRate'] ? Number(values['interestRate']) : undefined,
          }),
        })
        if (!res.ok) toast.error('Account updated, but the institution record failed to update')
      }

      if (type === 'govt_officer') {
        const payload = {
          fullName,
          phone: String(values['phone'] ?? '').trim(),
          ministry: values['ministry'] ? String(values['ministry']) : undefined,
          position: values['position'] ? String(values['position']) : undefined,
          staffId: values['staffId'] ? String(values['staffId']) : undefined,
          assignedCounty: county,
          assignedSubCounty: subCounty,
        }
        const res = officerProfileId
          ? await fetch(`/api/govt/internal/officer-profiles/${officerProfileId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await fetch('/api/govt/internal/officer-profiles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: farmerId, ...payload }),
            })
        if (!res.ok) toast.error('Account updated, but the government officer record failed to update')
      }

      toast.success('Account updated')
      router.push(`/admin/users/${farmerId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update account')
    } finally {
      setSubmitting(false)
    }
  }

  if (userQuery.isLoading || (needsProfile && profileQuery.isLoading)) {
    return <div className="h-64 animate-pulse rounded-lg bg-[#F3F4F6]" />
  }
  if (!config) {
    return <p className="text-sm text-ac-red">This account type can&apos;t be edited here.</p>
  }

  return (
    <div>
      <h1 className="mb-3 text-lg font-bold text-ink">Edit {config.title.replace('Create ', '')}</h1>
      <div className="rounded-base border border-border bg-white p-4">
        <RoleFormFields sections={config.sections} values={values} setValue={setValue} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/users/${farmerId}`)}
            className="rounded-md border border-border px-3.5 py-2 text-base font-semibold text-muted"
          >
            ← Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSave}
            className="rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : '✅ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
