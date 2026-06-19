'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle, Upload, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import api from '@/lib/api'

const PROVIDER_TYPES = [
  { value: 'extension_officer', label: 'Extension Officer', description: 'Agricultural extension services and farm advisory' },
  { value: 'vet_officer', label: 'Veterinary Officer', description: 'Animal health, diagnosis and treatment' },
  { value: 'agronomist', label: 'Agronomist', description: 'Crop science, soil management and yield optimisation' },
  { value: 'soil_lab', label: 'Soil Laboratory', description: 'Soil testing and analysis services' },
  { value: 'equipment_dealer', label: 'Equipment Dealer', description: 'Farm machinery sales, rental and repair' },
] as const

type ProviderType = (typeof PROVIDER_TYPES)[number]['value']

const SPECIALISATIONS = [
  'Crop Production', 'Livestock', 'Soil Health', 'Irrigation',
  'Pest Control', 'Soil Testing', 'Hydroponics', 'Aquaculture',
  'Poultry', 'Dairy', 'Horticulture', 'Grain Storage',
  'Agroforestry', 'Organic Farming', 'Beekeeping',
]

const KENYAN_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale',
  'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi',
  'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya',
  'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana',
  'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

const STEPS = ['Provider Type', 'Registration', 'Specialisations', 'Counties', 'Bio', 'Credentials']

const registrationSchema = z.object({
  type: z.enum(['extension_officer', 'vet_officer', 'agronomist', 'soil_lab', 'equipment_dealer']),
  registrationNumber: z.string().min(3, 'Registration number is required'),
  issuingBody: z.string().min(2, 'Issuing body is required'),
  specialisations: z.array(z.string()).min(1, 'Select at least one specialisation'),
  countiesServed: z.array(z.string()).min(1, 'Select at least one county'),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(1000),
})

interface FormState {
  type: ProviderType | ''
  registrationNumber: string
  issuingBody: string
  specialisations: string[]
  countiesServed: string[]
  bio: string
  credentialFiles: File[]
}

const INITIAL_STATE: FormState = {
  type: '',
  registrationNumber: '',
  issuingBody: '',
  specialisations: [],
  countiesServed: [],
  bio: '',
  credentialFiles: [],
}

export default function ProviderRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }, [])

  function toggleMulti(key: 'specialisations' | 'countiesServed', value: string) {
    setForm((prev) => {
      const current = prev[key]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {}
    if (step === 0 && !form.type) e.type = 'Select a provider type'
    if (step === 1) {
      if (!form.registrationNumber.trim()) e.registrationNumber = 'Required'
      if (!form.issuingBody.trim()) e.issuingBody = 'Required'
    }
    if (step === 2 && form.specialisations.length === 0) e.specialisations = 'Select at least one'
    if (step === 3 && form.countiesServed.length === 0) e.countiesServed = 'Select at least one'
    if (step === 4) {
      if (form.bio.length < 50) e.bio = 'Bio must be at least 50 characters'
      if (form.bio.length > 1000) e.bio = 'Bio must be under 1000 characters'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep()) setStep((s) => s + 1)
  }

  function back() {
    setStep((s) => s - 1)
    setErrors({})
  }

  async function uploadFile(file: File, userId: string): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', 'govt-documents')
    fd.append('entity_id', userId)
    const res = await api.post<{ data: { file_url: string } }>('/api/v1/media/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data.file_url
  }

  async function handleSubmit() {
    if (!validateStep()) return

    const parsed = registrationSchema.safeParse(form)
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(
          Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? '']),
        ),
      )
      return
    }

    setSubmitting(true)
    try {
      const meRes = await api.get<{ data: { id: string } }>('/api/v1/auth/me')
      const userId = meRes.data.data.id

      const credentialUrls: string[] = []
      for (const file of form.credentialFiles) {
        const url = await uploadFile(file, userId)
        credentialUrls.push(url)
      }

      await api.post('/api/v1/auth/providers/register', {
        type: form.type,
        registrationNumber: form.registrationNumber,
        issuingBody: form.issuingBody,
        specialisations: form.specialisations,
        countiesServed: form.countiesServed,
        bio: form.bio,
        verificationDocs: credentialUrls,
      })

      toast.success('Registration submitted — you will be notified once verified.')
      router.push('/provider/profile')
    } catch {
      toast.error('Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Provider Registration</h1>
        <p className="mt-1 text-sm text-gray-500">Complete all steps to register as a service provider</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < step
                  ? 'bg-green-600 text-white'
                  : i === step
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === step ? 'font-medium text-gray-900' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${i < step ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && 'Choose the type of agricultural service you provide'}
            {step === 1 && 'Enter your professional registration details'}
            {step === 2 && 'Select your areas of expertise'}
            {step === 3 && 'Select the counties where you operate'}
            {step === 4 && 'Write a short professional bio visible to farmers'}
            {step === 5 && 'Upload copies of your credentials (PDF, JPG, PNG — max 10 MB each)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 0: Type selection */}
          {step === 0 && (
            <div className="grid gap-3">
              {PROVIDER_TYPES.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('type', value)}
                  className={`flex flex-col items-start rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                    form.type === value
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{label}</span>
                  <span className="mt-0.5 text-xs text-gray-500">{description}</span>
                </button>
              ))}
              {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
            </div>
          )}

          {/* Step 1: Registration details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(e) => update('registrationNumber', e.target.value)}
                  placeholder="e.g. EO/2024/001234"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
                {errors.registrationNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.registrationNumber}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Issuing Body
                </label>
                <input
                  type="text"
                  value={form.issuingBody}
                  onChange={(e) => update('issuingBody', e.target.value)}
                  placeholder="e.g. Kenya Agricultural & Livestock Research Organisation"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
                {errors.issuingBody && (
                  <p className="mt-1 text-xs text-red-600">{errors.issuingBody}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Specialisations */}
          {step === 2 && (
            <div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SPECIALISATIONS.map((spec) => (
                  <label
                    key={spec}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      form.specialisations.includes(spec)
                        ? 'border-green-600 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.specialisations.includes(spec)}
                      onChange={() => toggleMulti('specialisations', spec)}
                    />
                    {spec}
                  </label>
                ))}
              </div>
              {errors.specialisations && (
                <p className="mt-2 text-xs text-red-600">{errors.specialisations}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {form.specialisations.length} selected
              </p>
            </div>
          )}

          {/* Step 3: Counties */}
          {step === 3 && (
            <div>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  className="text-xs text-green-600 underline"
                  onClick={() => setForm((p) => ({ ...p, countiesServed: [...KENYAN_COUNTIES] }))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs text-gray-500 underline"
                  onClick={() => setForm((p) => ({ ...p, countiesServed: [] }))}
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {KENYAN_COUNTIES.map((county) => (
                  <label
                    key={county}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      form.countiesServed.includes(county)
                        ? 'border-green-600 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.countiesServed.includes(county)}
                      onChange={() => toggleMulti('countiesServed', county)}
                    />
                    {county}
                  </label>
                ))}
              </div>
              {errors.countiesServed && (
                <p className="mt-2 text-xs text-red-600">{errors.countiesServed}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {form.countiesServed.length} of {KENYAN_COUNTIES.length} counties selected
              </p>
            </div>
          )}

          {/* Step 4: Bio */}
          {step === 4 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Professional Bio
              </label>
              <textarea
                rows={6}
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                placeholder="Describe your professional background, experience, and the services you offer to farmers..."
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              {errors.bio ? (
                <p className="mt-1 text-xs text-red-600">{errors.bio}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  {form.bio.length} / 1000 characters (minimum 50)
                </p>
              )}
            </div>
          )}

          {/* Step 5: Credentials */}
          {step === 5 && (
            <div className="space-y-4">
              <label
                htmlFor="credential-upload"
                className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-green-500"
              >
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Click to upload credentials</span>
                <span className="mt-1 text-xs text-gray-500">PDF, JPG, PNG — max 10 MB each</span>
                <input
                  id="credential-upload"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    setForm((prev) => ({
                      ...prev,
                      credentialFiles: [...prev.credentialFiles, ...files],
                    }))
                  }}
                />
              </label>

              {form.credentialFiles.length > 0 && (
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                  {form.credentialFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between px-4 py-2 text-sm"
                    >
                      <span className="truncate text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            credentialFiles: prev.credentialFiles.filter((_, i) => i !== idx),
                          }))
                        }
                        className="ml-4 flex-shrink-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-xs text-yellow-800">
                Your application will be reviewed within 3–5 business days. You will receive an SMS notification once verified.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            {step > 0 ? (
              <Button variant="outline" onClick={back} disabled={submitting}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Application'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
