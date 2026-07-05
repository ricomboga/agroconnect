'use client'

import { SuccessScreen } from '@agroconnect/web-ui'
import { useFarmerCreation } from '../../_context/FarmerCreationContext'

export default function FarmerSuccessPage() {
  const { state } = useFarmerCreation()

  return (
    <SuccessScreen
      title="Account Created Successfully!"
      sub={`${state.fullName || 'The farmer'}'s account and farm "${
        state.farmName || '—'
      }" (${state.plots.length} plot${state.plots.length === 1 ? '' : 's'}) were created. AI activity
      schedules were generated and an SMS was sent to ${state.phone || 'the farmer'}.`}
      credentials={[
        { label: 'Phone', value: state.phone || '—' },
        { label: 'Farm', value: `${state.farmName || '—'} (${state.areaAcres || '0'} acres)` },
        { label: 'Temp PIN', value: '1234 — must change on login' },
        { label: 'KYC Status', value: 'Pending — documents needed' },
      ]}
      nextActions={[
        {
          label: '👤 View User Profile',
          href: state.createdUserId ? `/admin/users/${state.createdUserId}` : '/admin/users',
        },
        { label: '➕ Create Another User', href: '/admin/users/new' },
      ]}
    />
  )
}
