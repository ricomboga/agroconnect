'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  FormSection,
  FieldGroup,
  Field,
  TextInput,
  Select,
  Textarea,
  ChipSelect,
  SuccessScreen,
} from '@agroconnect/web-ui'

type ProgramType =
  | 'fertiliser_subsidy'
  | 'seed_distribution'
  | 'equipment'
  | 'training'
  | 'cash_transfer'
  | 'irrigation'

type FarmerSubtype = 'crops' | 'livestock' | 'both'

const PROGRAM_TYPES: { value: ProgramType; label: string }[] = [
  { value: 'fertiliser_subsidy', label: 'Fertiliser Subsidy' },
  { value: 'seed_distribution', label: 'Seed Distribution' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'training', label: 'Training' },
  { value: 'cash_transfer', label: 'Cash Transfer' },
  { value: 'irrigation', label: 'Irrigation' },
]

const ADMINISTERING_BODIES = ['Ministry of Agriculture HQ', 'County Government', 'KALRO']

const DISTRIBUTION_METHODS = [
  'Farmer collects at NCPB depot',
  'County office pickup',
  'Home delivery (arranged)',
  'Voucher system',
]

const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa', 'Wajir',
  'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos',
  'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot',
  'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia',
  'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia',
  'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi',
] as const

const FARMER_SUBTYPE_OPTIONS: { value: FarmerSubtype; label: string }[] = [
  { value: 'crops', label: '🌾 Crops' },
  { value: 'livestock', label: '🐄 Livestock' },
  { value: 'both', label: '🌾🐄 Both' },
]

interface CreateProgramPayload {
  name: string
  type: ProgramType
  administering_body: string
  description: string
  application_open_date: string
  application_close_date: string
  total_budget_kes: number
  max_beneficiaries?: number
  item_distributed?: string
  max_farm_size_acres?: number
  min_farm_size_acres?: number
  eligible_counties: string[]
  require_active_crop: boolean
  one_per_farmer: boolean
  id_verification_required: boolean
  farm_registration_required: boolean
  eligible_farmer_subtypes: FarmerSubtype[]
  distribution_method: string
  collection_points: string[]
}

export function NewProgramForm() {
  const [name, setName] = useState('')
  const [type, setType] = useState<ProgramType>('fertiliser_subsidy')
  const [administeringBody, setAdministeringBody] = useState(ADMINISTERING_BODIES[0])
  const [description, setDescription] = useState('')
  const [openDate, setOpenDate] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [maxBeneficiaries, setMaxBeneficiaries] = useState('')
  const [itemDistributed, setItemDistributed] = useState('')
  const [maxFarmSize, setMaxFarmSize] = useState('')
  const [minFarmSize, setMinFarmSize] = useState('')
  const [eligibleCounties, setEligibleCounties] = useState<string[]>([])
  const [requireActiveCrop, setRequireActiveCrop] = useState('yes')
  const [onePerFarmer, setOnePerFarmer] = useState('yes')
  const [idVerificationRequired, setIdVerificationRequired] = useState('yes')
  const [farmRegistrationRequired, setFarmRegistrationRequired] = useState('no')
  const [farmerSubtypes, setFarmerSubtypes] = useState<string[]>(['crops', 'livestock', 'both'])
  const [distributionMethod, setDistributionMethod] = useState(DISTRIBUTION_METHODS[0])
  const [collectionPointsText, setCollectionPointsText] = useState('')

  const mutation = useMutation({
    mutationFn: async (payload: CreateProgramPayload) => {
      const res = await fetch('/api/govt/subsidies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Failed to create program')
      }
      return res.json() as Promise<{ data: { id: string; name: string } }>
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const collectionPoints = collectionPointsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const payload: CreateProgramPayload = {
      name,
      type,
      administering_body: administeringBody,
      description,
      application_open_date: openDate,
      application_close_date: closeDate,
      total_budget_kes: Number(totalBudget),
      max_beneficiaries: maxBeneficiaries ? Number(maxBeneficiaries) : undefined,
      item_distributed: itemDistributed || undefined,
      max_farm_size_acres: maxFarmSize ? Number(maxFarmSize) : undefined,
      min_farm_size_acres: minFarmSize ? Number(minFarmSize) : undefined,
      eligible_counties: eligibleCounties,
      require_active_crop: requireActiveCrop === 'yes',
      one_per_farmer: onePerFarmer === 'yes',
      id_verification_required: idVerificationRequired === 'yes',
      farm_registration_required: farmRegistrationRequired === 'yes',
      eligible_farmer_subtypes: farmerSubtypes as FarmerSubtype[],
      distribution_method: distributionMethod,
      collection_points: collectionPoints,
    }

    mutation.mutate(payload)
  }

  function toggleCounty(county: string) {
    setEligibleCounties((prev) =>
      prev.includes(county) ? prev.filter((c) => c !== county) : [...prev, county],
    )
  }

  if (mutation.isSuccess) {
    return (
      <SuccessScreen
        title="Program Published"
        sub={`"${mutation.data.data.name}" is now live on the farmer mobile app. Eligible farmers will receive a push notification.`}
        nextActions={[
          { label: 'Back to Dashboard', href: '/govt' },
          { label: 'Create Another Program', href: '/govt/programs/new' },
        ]}
      />
    )
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Create Government Program</p>
        <p className="mt-0.5 text-sm text-muted">
          Programs appear on the farmer mobile app immediately on publish
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3.5">
        <div>
          <FormSection title="Program Details">
            <Field label="Program Name" required>
              <TextInput
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MSAI Fertiliser Subsidy 2026"
              />
            </Field>
            <FieldGroup cols={2}>
              <Field label="Program Type" required>
                <Select value={type} onChange={(e) => setType(e.target.value as ProgramType)}>
                  {PROGRAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Administering Body" required>
                <Select value={administeringBody} onChange={(e) => setAdministeringBody(e.target.value)}>
                  {ADMINISTERING_BODIES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldGroup>
            <Field label="Description (shown to farmers)">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <FieldGroup cols={2}>
              <Field label="Application Open Date" required>
                <TextInput required type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
              </Field>
              <Field label="Application Close Date" required>
                <TextInput required type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
              </Field>
            </FieldGroup>
            <FieldGroup cols={2}>
              <Field label="Total Budget (KES)" required>
                <TextInput
                  required
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                />
              </Field>
              <Field label="Max Beneficiaries" hint="Leave blank = budget limited">
                <TextInput
                  type="number"
                  value={maxBeneficiaries}
                  onChange={(e) => setMaxBeneficiaries(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <Field label="Item to be Distributed">
              <TextInput
                value={itemDistributed}
                onChange={(e) => setItemDistributed(e.target.value)}
                placeholder="e.g. 50kg CAN Fertiliser (1 bag per farmer)"
              />
            </Field>
          </FormSection>
        </div>

        <div>
          <FormSection title="Eligibility Criteria">
            <FieldGroup cols={2}>
              <Field label="Max Farm Size (acres)" hint="Farmers above this size are ineligible">
                <TextInput type="number" value={maxFarmSize} onChange={(e) => setMaxFarmSize(e.target.value)} />
              </Field>
              <Field label="Min Farm Size (acres)" hint="None">
                <TextInput type="number" value={minFarmSize} onChange={(e) => setMinFarmSize(e.target.value)} />
              </Field>
            </FieldGroup>
            <Field label="Eligible Counties" required hint="Click to toggle a county">
              <div className="rounded-sm border border-border p-2">
                <ChipSelect
                  multiple
                  options={KENYA_COUNTIES.map((c) => ({ value: c, label: c }))}
                  value={eligibleCounties}
                  onChange={setEligibleCounties}
                />
                <button
                  type="button"
                  onClick={() => setEligibleCounties([...KENYA_COUNTIES])}
                  className="mt-2 text-sm font-semibold text-ac-green"
                >
                  Select All 47 Counties
                </button>
              </div>
            </Field>
            <FieldGroup cols={2}>
              <Field label="Require Active Crop?">
                <ChipSelect
                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                  value={requireActiveCrop}
                  onChange={setRequireActiveCrop}
                />
              </Field>
              <Field label="One Per Farmer">
                <ChipSelect
                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No limit' }]}
                  value={onePerFarmer}
                  onChange={setOnePerFarmer}
                />
              </Field>
            </FieldGroup>
            <FieldGroup cols={2}>
              <Field label="ID Verification Required?">
                <ChipSelect
                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                  value={idVerificationRequired}
                  onChange={setIdVerificationRequired}
                />
              </Field>
              <Field label="Farm Registration Required?">
                <ChipSelect
                  options={[{ value: 'yes', label: 'Mandatory' }, { value: 'no', label: 'Recommended' }]}
                  value={farmRegistrationRequired}
                  onChange={setFarmRegistrationRequired}
                />
              </Field>
            </FieldGroup>
            <Field label="Farmer Sub-types Eligible" required>
              <ChipSelect
                multiple
                options={FARMER_SUBTYPE_OPTIONS}
                value={farmerSubtypes}
                onChange={setFarmerSubtypes}
              />
            </Field>
          </FormSection>

          <FormSection title="Distribution Settings">
            <Field label="Distribution Method">
              <Select value={distributionMethod} onChange={(e) => setDistributionMethod(e.target.value)}>
                {DISTRIBUTION_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Collection Points (one per line)">
              <Textarea
                value={collectionPointsText}
                onChange={(e) => setCollectionPointsText(e.target.value)}
                placeholder={'Nakuru NCPB Depot\nBahati Sub-county Office'}
              />
            </Field>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={mutation.isPending || eligibleCounties.length === 0}
                className="flex-1 rounded-md bg-ac-green px-3 py-2.5 text-center text-base font-semibold text-white disabled:opacity-50"
              >
                🚀 Publish Program
              </button>
            </div>
          </FormSection>
        </div>
      </form>
    </div>
  )
}
