'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui',
  'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
  'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita Taveta', 'Tana River', 'Tharaka Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

const FARM_TYPES = [
  { value: 'crops',   label: '🌾 Crops Only'   },
  { value: 'animals', label: '🐄 Animals Only'  },
  { value: 'both',    label: '🌾🐄 Both'        },
] as const

type FarmType = 'crops' | 'animals' | 'both'

interface PlotDraft {
  key: string
  name: string
  areaAcres: string
}

interface CreateFarmResponse {
  data?: { id: string }
  id?: string
}

interface ApiError {
  message?: string
  error?: { message?: string }
}

// ── helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-[#E5E7EB] rounded-[5px] py-[7px] px-[9px] text-[10px] text-[#111827] bg-[#F9FAFB] focus:outline-none focus:border-[#1A6B3C]'

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold text-[#1A6B3C] uppercase tracking-[0.8px] mb-[10px] pb-[5px] border-b border-[#EAF4EE] mt-6 first:mt-0">
      {children}
    </div>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label && (
        <label className="mb-1 block text-[10px] font-semibold text-[#374151]">
          {label}
          {required && <span className="text-[#DC2626] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-[9px] text-[#DC2626]">{error}</p>}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function CreateFarmForm() {
  const router = useRouter()

  const [farmName,    setFarmName]    = useState('')
  const [farmSize,    setFarmSize]    = useState('')
  const [county,      setCounty]      = useState('')
  const [subCounty,   setSubCounty]   = useState('')
  const [farmType,    setFarmType]    = useState<FarmType | ''>('')
  const [lat,         setLat]         = useState('')
  const [lng,         setLng]         = useState('')
  const [waterSource, setWaterSource] = useState('')
  const [soilType,    setSoilType]    = useState('')
  const [plots,       setPlots]       = useState<PlotDraft[]>([
    { key: '1', name: '', areaAcres: '' },
  ])
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  const canSubmit =
    farmName.trim().length >= 2 && county && farmSize && farmType && lat && lng

  function clearErr(key: string) {
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function addPlot() {
    setPlots((prev) => [...prev, { key: String(Date.now()), name: '', areaAcres: '' }])
  }

  function removePlot(key: string) {
    setPlots((prev) => prev.filter((p) => p.key !== key))
  }

  function updatePlot(key: string, field: 'name' | 'areaAcres', value: string) {
    setPlots((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)),
    )
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (farmName.trim().length < 2)  errs.farmName = 'Minimum 2 characters'
    if (!county)                      errs.county   = 'Required'
    const sz = parseFloat(farmSize)
    if (!farmSize || isNaN(sz) || sz < 0.1 || sz > 10000)
      errs.farmSize = '0.1 – 10,000 acres'
    if (!farmType) errs.farmType = 'Select a farm type'
    const la = parseFloat(lat)
    if (!lat || isNaN(la) || la < -90  || la > 90)
      errs.lat = 'Must be −90 to 90'
    const ln = parseFloat(lng)
    if (!lng || isNaN(ln) || ln < -180 || ln > 180)
      errs.lng = 'Must be −180 to 180'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/farm/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        farmName.trim(),
          county,
          subCounty:   subCounty.trim() || undefined,
          areaAcres:   parseFloat(farmSize),
          farmType,
          locationLat: parseFloat(lat),
          locationLng: parseFloat(lng),
          waterSource: waterSource || undefined,
          soilType:    soilType    || undefined,
          plots: plots
            .filter((p) => p.name.trim())
            .map((p) => ({
              name:      p.name.trim(),
              areaAcres: parseFloat(p.areaAcres) || 0,
            })),
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError
        throw new Error(body.message ?? body.error?.message ?? 'Failed to create farm')
      }

      const body = (await res.json()) as CreateFarmResponse
      const newId = body.data?.id ?? body.id ?? ''
      router.push(`/farms/${newId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create farm')
    } finally {
      setSubmitting(false)
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* ── Farm Details ──────────────────────────────────────────────── */}
      <SectionHeading>Farm Details</SectionHeading>

      <div className="space-y-4">
        {/* Row 1: Name + Size */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Farm Name" required error={errors.farmName}>
            <input
              className={inputCls}
              placeholder="e.g. Nakuru Farm"
              value={farmName}
              onChange={(e) => { setFarmName(e.target.value); clearErr('farmName') }}
            />
          </Field>

          <Field label="Farm Size" required error={errors.farmSize}>
            <div className="relative">
              <input
                className={inputCls + ' pr-12'}
                type="number"
                step="0.01"
                min="0.1"
                max="10000"
                placeholder="2.5"
                value={farmSize}
                onChange={(e) => { setFarmSize(e.target.value); clearErr('farmSize') }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[#9CA3AF]">
                acres
              </span>
            </div>
          </Field>
        </div>

        {/* Row 2: County + Sub-county */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="County" required error={errors.county}>
            <select
              className={inputCls}
              value={county}
              onChange={(e) => { setCounty(e.target.value); clearErr('county') }}
            >
              <option value="">Select county</option>
              {KENYA_COUNTIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Sub-county">
            <input
              className={inputCls}
              placeholder="e.g. Njoro"
              value={subCounty}
              onChange={(e) => setSubCounty(e.target.value)}
            />
          </Field>
        </div>

        {/* Farm Type tiles */}
        <div>
          <p className="mb-1 text-[10px] font-semibold text-[#374151]">
            Farm Type<span className="text-[#DC2626] ml-0.5">*</span>
          </p>
          <div className="flex gap-3">
            {FARM_TYPES.map((ft) => {
              const active = farmType === ft.value
              return (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => { setFarmType(ft.value); clearErr('farmType') }}
                  className="flex-1 rounded-[6px] py-[10px] px-2 text-[10px] text-center transition-all cursor-pointer"
                  style={{
                    background:  active ? '#EAF4EE' : '#fff',
                    border:      active ? '2px solid #1A6B3C' : '1px solid #E5E7EB',
                    color:       active ? '#1A6B3C' : '#6B7280',
                    fontWeight:  active ? 600 : 400,
                  }}
                >
                  {ft.label}
                </button>
              )
            })}
          </div>
          {errors.farmType && (
            <p className="mt-1 text-[9px] text-[#DC2626]">{errors.farmType}</p>
          )}
        </div>

        {/* GPS */}
        <div>
          <p className="mb-1 text-[10px] font-semibold text-[#374151]">
            GPS Location<span className="text-[#DC2626] ml-0.5">*</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                className={inputCls}
                type="number"
                step="any"
                placeholder="-0.3031"
                value={lat}
                onChange={(e) => { setLat(e.target.value); clearErr('lat') }}
              />
              <span className="mt-0.5 block text-[9px] text-[#9CA3AF]">Latitude</span>
              {errors.lat && (
                <p className="mt-0.5 text-[9px] text-[#DC2626]">{errors.lat}</p>
              )}
            </div>
            <div>
              <input
                className={inputCls}
                type="number"
                step="any"
                placeholder="36.0800"
                value={lng}
                onChange={(e) => { setLng(e.target.value); clearErr('lng') }}
              />
              <span className="mt-0.5 block text-[9px] text-[#9CA3AF]">Longitude</span>
              {errors.lng && (
                <p className="mt-0.5 text-[9px] text-[#DC2626]">{errors.lng}</p>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-[9px] text-[#9CA3AF]">
            Open Google Maps, tap your farm location, copy the coordinates.
          </p>
        </div>

        {/* Water + Soil */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Water Source">
            <select
              className={inputCls}
              value={waterSource}
              onChange={(e) => setWaterSource(e.target.value)}
            >
              <option value="">Select…</option>
              {['Rain', 'Irrigation', 'Borehole', 'River', 'Mixed'].map((w) => (
                <option key={w} value={w.toLowerCase()}>{w}</option>
              ))}
            </select>
          </Field>

          <Field label="Soil Type">
            <select
              className={inputCls}
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
            >
              <option value="">Select…</option>
              {['Loam', 'Clay', 'Sandy', 'Silty', 'Peaty', 'Chalky'].map((s) => (
                <option key={s} value={s.toLowerCase()}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ── Plots / Fields ────────────────────────────────────────────── */}
      <SectionHeading>Plots / Fields</SectionHeading>

      <p className="text-[10px] text-[#6B7280] mb-3">
        A plot is a section of your farm. You can add one or several.
      </p>

      <div className="space-y-2 mb-2">
        {plots.map((plot) => (
          <div
            key={plot.key}
            className="flex items-center gap-3 border border-[#E5E7EB] rounded-[6px] p-[10px]"
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <input
                className={inputCls}
                placeholder="e.g. Plot A, North Field"
                value={plot.name}
                onChange={(e) => updatePlot(plot.key, 'name', e.target.value)}
              />
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                max={parseFloat(farmSize) > 0 ? parseFloat(farmSize) : undefined}
                placeholder="Size (acres)"
                value={plot.areaAcres}
                onChange={(e) => updatePlot(plot.key, 'areaAcres', e.target.value)}
              />
            </div>

            {plots.length > 1 && (
              <button
                type="button"
                onClick={() => removePlot(plot.key)}
                className="flex items-center gap-1 text-[10px] text-[#DC2626] hover:opacity-75 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addPlot}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-[#1A6B3C] hover:text-[#0D4A28]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Another Plot
      </button>

      {/* Error alert */}
      {submitError && (
        <div
          className="rounded-[5px] bg-[#FEE2E2] px-[9px] py-[6px] text-[9px] text-[#7F1D1D] mt-4"
          style={{ borderLeft: '3px solid #DC2626' }}
        >
          {submitError}
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex items-center justify-center gap-1.5 bg-[#1A6B3C] text-white text-[10px] font-semibold py-[9px] px-[10px] rounded-[6px] hover:bg-[#0D4A28] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting ? 'Creating…' : 'Create Farm →'}
        </button>
      </div>
    </form>
  )
}
