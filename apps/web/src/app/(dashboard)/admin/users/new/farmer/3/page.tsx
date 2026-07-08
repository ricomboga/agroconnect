'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FormSection, Field, FieldGroup, ChipSelect, TextInput, Select } from '@agroconnect/web-ui'
import { useFarmerCreation } from '../../_context/FarmerCreationContext'

const CROP_OPTIONS = [
  { value: 'maize', label: '🌽 Maize' },
  { value: 'cabbage', label: '🥬 Cabbage' },
  { value: 'beans', label: '🫘 Beans' },
  { value: 'tomato', label: '🍅 Tomato' },
  { value: 'potato', label: '🥔 Potato' },
  { value: 'wheat', label: '🌾 Wheat' },
  { value: 'sunflower', label: '🌻 Sunflower' },
  { value: 'coffee', label: '☕ Coffee' },
  { value: 'tea', label: '🍵 Tea' },
  { value: 'sugarcane', label: '🎋 Sugarcane' },
  { value: 'cassava', label: '🍠 Cassava' },
  { value: 'sweet_potato', label: '🍠 Sweet Potato' },
  { value: 'sorghum', label: '🌾 Sorghum' },
  { value: 'millet', label: '🌾 Millet' },
  { value: 'banana', label: '🍌 Banana' },
  { value: 'groundnuts', label: '🥜 Groundnuts' },
  { value: 'avocado', label: '🥑 Avocado' },
  { value: 'mango', label: '🥭 Mango' },
  { value: 'onion', label: '🧅 Onion' },
  { value: 'kale', label: '🥬 Kale (Sukuma Wiki)' },
  { value: 'rice', label: '🍚 Rice' },
  { value: 'macadamia', label: '🌰 Macadamia' },
  { value: 'pyrethrum', label: '🌼 Pyrethrum' },
  { value: 'cotton', label: '🌱 Cotton' },
]

const LIVESTOCK_OPTIONS = [
  { value: 'dairy_cattle', label: '🐄 Dairy Cattle' },
  { value: 'beef_cattle', label: '🐂 Beef Cattle' },
  { value: 'layers', label: '🐔 Layers' },
  { value: 'broilers', label: '🐓 Broilers' },
  { value: 'pigs', label: '🐖 Pigs' },
  { value: 'goats', label: '🐐 Goats' },
  { value: 'sheep', label: '🐑 Sheep' },
  { value: 'fish_farming', label: '🐟 Fish Farming (Aquaculture)' },
  { value: 'rabbits', label: '🐇 Rabbits' },
  { value: 'bees', label: '🐝 Bees (Apiary)' },
  { value: 'camels', label: '🐫 Camels' },
]

const LIVESTOCK_COUNT_LABELS: Record<string, string> = {
  dairy_cattle: 'Dairy Cattle (heads)',
  beef_cattle: 'Beef Cattle (heads)',
  layers: 'Layers / Hens (birds)',
  broilers: 'Broilers (birds)',
  goats: 'Goats (heads)',
  pigs: 'Pigs (heads)',
  sheep: 'Sheep (heads)',
  fish_farming: 'Fish (ponds/cages)',
  rabbits: 'Rabbits (heads)',
  bees: 'Bee Hives (count)',
  camels: 'Camels (heads)',
}

export default function FarmerStep3Page() {
  const router = useRouter()
  const { state, update } = useFarmerCreation()
  const [error, setError] = useState('')

  const showCrops = state.farmerType === 'crops' || state.farmerType === 'both'
  const showLivestock = state.farmerType === 'livestock' || state.farmerType === 'both'

  function handleNext() {
    if (!state.farmerType) {
      setError('Please select a farming sub-type')
      return
    }
    router.push('/admin/users/new/farmer/4')
  }

  return (
    <div>
      <FormSection title="Farming Sub-type">
        <ChipSelect
          options={[
            { value: 'crops', label: '🌾 Crops Only' },
            { value: 'livestock', label: '🐄 Livestock Only' },
            { value: 'both', label: '🌾🐄 Both' },
          ]}
          value={state.farmerType}
          onChange={(v) => {
            update({ farmerType: v as typeof state.farmerType })
            setError('')
          }}
        />
        {error && <p className="text-xs text-ac-red">{error}</p>}
      </FormSection>

      {showCrops && (
        <FormSection title="Primary Crops (select all)">
          <ChipSelect
            options={CROP_OPTIONS}
            multiple
            value={state.crops}
            onChange={(v) => update({ crops: v })}
          />
        </FormSection>
      )}

      {showLivestock && (
        <>
          <FormSection title="Livestock Types (select all)">
            <ChipSelect
              options={LIVESTOCK_OPTIONS}
              multiple
              value={state.livestockTypes}
              onChange={(v) => update({ livestockTypes: v })}
            />
          </FormSection>

          {state.livestockTypes.length > 0 && (
            <FormSection title="Initial Livestock Counts (optional)">
              <FieldGroup cols={3}>
                {state.livestockTypes
                  .filter((t) => LIVESTOCK_COUNT_LABELS[t])
                  .map((t) => (
                    <Field key={t} label={LIVESTOCK_COUNT_LABELS[t]}>
                      <TextInput
                        type="number"
                        min={0}
                        value={state.livestockCounts[t] ?? ''}
                        onChange={(e) =>
                          update({
                            livestockCounts: { ...state.livestockCounts, [t]: e.target.value },
                          })
                        }
                      />
                    </Field>
                  ))}
              </FieldGroup>
            </FormSection>
          )}
        </>
      )}

      <FormSection title="Experience Level">
        <FieldGroup cols={2}>
          <Field label="Years farming">
            <Select
              value={state.experienceYears}
              onChange={(e) => update({ experienceYears: e.target.value })}
            >
              <option value="">Select…</option>
              <option value="0-1">0-1 years</option>
              <option value="2-5">2-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10+">10+ years</option>
            </Select>
          </Field>
          <Field label="Primary income source">
            <Select
              value={state.incomeSource}
              onChange={(e) => update({ incomeSource: e.target.value })}
            >
              <option value="">Select…</option>
              <option value="farming_primary">Farming, primary income</option>
              <option value="farming_secondary">Farming, secondary income</option>
              <option value="subsistence_only">Subsistence only</option>
            </Select>
          </Field>
        </FieldGroup>
      </FormSection>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push('/admin/users/new/farmer/2')}
          className="rounded-md border border-border px-3.5 py-2 text-base font-semibold text-muted"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white"
        >
          Next: Farm Setup →
        </button>
      </div>
    </div>
  )
}
