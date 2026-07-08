'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormSection, Field, FieldGroup, TextInput, Select, AlertBox } from '@agroconnect/web-ui'
import { useFarmerCreation, type PlotDraft } from '../../_context/FarmerCreationContext'

function emptyPlot(): PlotDraft {
  return {
    id: crypto.randomUUID(),
    plotName: '',
    plotSize: '',
    crop: '',
    plantingDate: '',
    season: '',
    seedSource: '',
    targetYield: '',
  }
}

export default function FarmerStep4Page() {
  const router = useRouter()
  const { state, update } = useFarmerCreation()
  const [validating, setValidating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function updatePlot(id: string, patch: Partial<PlotDraft>) {
    update({ plots: state.plots.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  }

  function addPlot() {
    update({ plots: [...state.plots, emptyPlot()] })
  }

  function removePlot(id: string) {
    update({ plots: state.plots.filter((p) => p.id !== id) })
  }

  async function handleValidateGps() {
    const lat = Number(state.gpsLat)
    const lng = Number(state.gpsLng)
    if (!state.gpsLat || !state.gpsLng || !state.county) {
      toast.error('Enter latitude, longitude, and confirm county first')
      return
    }
    setValidating(true)
    try {
      const res = await fetch(
        `/api/farm/admin/validate-gps?lat=${lat}&lng=${lng}&county=${encodeURIComponent(state.county)}`,
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body?.message_key ?? 'Validation failed')
      update({ gpsValidation: body.data })
      if (!body.data.valid) {
        toast.error(`GPS falls outside ${state.county} (nearest: ${body.data.nearestCounty})`)
      } else {
        toast.success('GPS location confirmed within county')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'GPS validation failed')
    } finally {
      setValidating(false)
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!state.farmName.trim()) errs.farmName = 'Required'
    if (!state.areaAcres || Number(state.areaAcres) <= 0) errs.areaAcres = 'Required'
    if (!state.gpsLat) errs.gpsLat = 'Required'
    if (!state.gpsLng) errs.gpsLng = 'Required'
    if (!state.waterSource) errs.waterSource = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return false
    if (!state.gpsValidation || !state.gpsValidation.valid) {
      toast.error('Please validate GPS coordinates against the declared county first')
      return false
    }
    return true
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Farm creation is web-only (AD-FM-01). AI activity schedule is auto-generated per crop on
        save.
      </p>

      <FormSection title="Farm Basics">
        <FieldGroup cols={2}>
          <Field label="Farm Name" required>
            <TextInput value={state.farmName} onChange={(e) => update({ farmName: e.target.value })} />
            {errors.farmName && <p className="mt-1 text-xs text-ac-red">{errors.farmName}</p>}
          </Field>
          <Field label="Total Area (acres)" required>
            <TextInput
              type="number"
              min={0}
              step="0.1"
              value={state.areaAcres}
              onChange={(e) => update({ areaAcres: e.target.value })}
            />
            {errors.areaAcres && <p className="mt-1 text-xs text-ac-red">{errors.areaAcres}</p>}
          </Field>
          <Field label="GPS Latitude" required>
            <TextInput
              value={state.gpsLat}
              onChange={(e) => update({ gpsLat: e.target.value, gpsValidation: null })}
              placeholder="-0.3031"
            />
            {errors.gpsLat && <p className="mt-1 text-xs text-ac-red">{errors.gpsLat}</p>}
          </Field>
          <Field label="GPS Longitude" required>
            <TextInput
              value={state.gpsLng}
              onChange={(e) => update({ gpsLng: e.target.value, gpsValidation: null })}
              placeholder="36.0800"
            />
            {errors.gpsLng && <p className="mt-1 text-xs text-ac-red">{errors.gpsLng}</p>}
          </Field>
          <Field label="Altitude (m above sea level)">
            <TextInput value={state.altitude} onChange={(e) => update({ altitude: e.target.value })} />
          </Field>
          <Field label="Water Source" required>
            <Select value={state.waterSource} onChange={(e) => update({ waterSource: e.target.value })}>
              <option value="">Select…</option>
              <option value="borehole">Borehole + Rainwater</option>
              <option value="river">River / Stream</option>
              <option value="rain">Rain-fed only</option>
              <option value="irrigation">Irrigation, piped</option>
              <option value="mixed">Dam / Water pan</option>
            </Select>
            {errors.waterSource && <p className="mt-1 text-xs text-ac-red">{errors.waterSource}</p>}
          </Field>
          <Field label="Soil Type">
            <Select value={state.soilType} onChange={(e) => update({ soilType: e.target.value })}>
              <option value="">Select…</option>
              <option value="loam">Loam</option>
              <option value="clay">Clay</option>
              <option value="sandy">Sandy</option>
              <option value="silty">Black cotton (silty)</option>
              <option value="chalky">Red volcanic (chalky)</option>
            </Select>
          </Field>
          <Field label="Farming System">
            <Select
              value={state.farmingSystem}
              onChange={(e) => update({ farmingSystem: e.target.value })}
            >
              <option value="">Select…</option>
              <option value="smallholder_mixed">Smallholder mixed</option>
              <option value="subsistence">Subsistence only</option>
              <option value="commercial">Commercial</option>
            </Select>
          </Field>
        </FieldGroup>
      </FormSection>

      <FormSection title="GPS Validation">
        <button
          type="button"
          onClick={handleValidateGps}
          disabled={validating}
          className="w-fit rounded-md bg-ac-blue px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {validating ? 'Checking…' : '📍 Validate GPS Against County'}
        </button>
        {state.gpsValidation && !state.gpsValidation.valid && (
          <AlertBox variant="red">
            GPS coordinates fall outside {state.county} (nearest county: {state.gpsValidation.nearestCounty},{' '}
            {state.gpsValidation.distanceKm} km away). Please re-enter or confirm the county. This will
            also be flagged during KYC review.
          </AlertBox>
        )}
        {state.gpsValidation?.valid && (
          <AlertBox variant="green">
            ✓ GPS location confirmed, {state.gpsValidation.distanceKm} km from {state.county} centroid.
          </AlertBox>
        )}
      </FormSection>

      <FormSection title="Plots & Crops">
        <AlertBox variant="green">
          Saving this farm auto-generates an AI activity schedule for each plot&apos;s crop from its
          planting date.
        </AlertBox>
        {state.plots.map((plot, idx) => (
          <div key={plot.id} className="rounded-base border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">Plot {idx + 1}</span>
              <button
                type="button"
                onClick={() => removePlot(plot.id)}
                className="text-sm font-semibold text-ac-red"
              >
                🗑 Remove Plot
              </button>
            </div>
            <FieldGroup cols={2}>
              <Field label="Plot Name">
                <TextInput
                  value={plot.plotName}
                  onChange={(e) => updatePlot(plot.id, { plotName: e.target.value })}
                  placeholder="Plot A"
                />
              </Field>
              <Field label="Plot Size (acres)">
                <TextInput
                  type="number"
                  min={0}
                  step="0.1"
                  value={plot.plotSize}
                  onChange={(e) => updatePlot(plot.id, { plotSize: e.target.value })}
                />
              </Field>
              <Field label="Crop" required>
                <TextInput
                  value={plot.crop}
                  onChange={(e) => updatePlot(plot.id, { crop: e.target.value })}
                  placeholder="Maize"
                />
              </Field>
              <Field label="Planting Date" required hint="Triggers AI schedule from this date">
                <TextInput
                  type="date"
                  value={plot.plantingDate}
                  onChange={(e) => updatePlot(plot.id, { plantingDate: e.target.value })}
                />
              </Field>
              <Field label="Season">
                <Select
                  value={plot.season}
                  onChange={(e) => updatePlot(plot.id, { season: e.target.value })}
                >
                  <option value="">Select…</option>
                  <option value="long_rains">Long Rains (Mar-Jun)</option>
                  <option value="short_rains">Short Rains (Oct-Dec)</option>
                  <option value="dry_irrigation">Dry Season (irrigation)</option>
                </Select>
              </Field>
              <Field label="Seed Source">
                <Select
                  value={plot.seedSource}
                  onChange={(e) => updatePlot(plot.id, { seedSource: e.target.value })}
                >
                  <option value="">Select…</option>
                  <option value="certified">Certified (KEPHIS)</option>
                  <option value="own_saved">Own saved seed</option>
                  <option value="market">Market (unverified)</option>
                </Select>
              </Field>
              <Field label="Target Yield (kg/acre)">
                <TextInput
                  type="number"
                  min={0}
                  value={plot.targetYield}
                  onChange={(e) => updatePlot(plot.id, { targetYield: e.target.value })}
                />
              </Field>
            </FieldGroup>
          </div>
        ))}
        <button
          type="button"
          onClick={addPlot}
          className="w-fit rounded-md border border-ac-green px-3 py-1.5 text-sm font-semibold text-ac-green"
        >
          + Add Plot
        </button>
      </FormSection>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push('/admin/users/new/farmer/3')}
          className="rounded-md border border-border px-3.5 py-2 text-base font-semibold text-muted"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (validate()) router.push('/admin/users/new/farmer/5')
          }}
          className="rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white"
        >
          Next: Assignments →
        </button>
      </div>
    </div>
  )
}
