'use client'

import { SuccessScreen } from '@agroconnect/web-ui'
import { useNgoFarmerCreation } from '../_context/NgoFarmerCreationContext'

export default function NgoFarmerSuccessPage() {
  const { state } = useNgoFarmerCreation()

  return (
    <SuccessScreen
      title="Farmer Added Successfully!"
      sub={`${state.fullName || 'The farmer'}'s account and farm "${
        state.farmName || '—'
      }" (${state.plots.length} plot${state.plots.length === 1 ? '' : 's'}) were created. AI activity
      schedules were generated and an SMS was sent to ${state.phone || 'the farmer'}.`}
      credentials={[
        { label: 'Phone', value: state.phone || '—' },
        { label: 'Farm', value: `${state.farmName || '—'} (${state.areaAcres || '0'} acres)` },
        { label: 'Temp PIN', value: '1234, must change on login' },
      ]}
      nextActions={[
        { label: '🧑‍🌾 View in Farmer Reports', href: '/lender/farmer-reports' },
        { label: '➕ Add Another Farmer', href: '/lender/farmers/new' },
      ]}
    />
  )
}
