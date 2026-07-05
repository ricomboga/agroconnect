'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FormSection, AlertBox } from '@agroconnect/web-ui'
import { useFarmerCreation } from '../../_context/FarmerCreationContext'

interface Partner {
  id: string
  name: string
}
interface Expert {
  id: string
  full_name: string
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 text-sm last:border-none">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

export default function FarmerStep6Page() {
  const router = useRouter()
  const { state, update } = useFarmerCreation()
  const [submitting, setSubmitting] = useState(false)
  const [lenderName, setLenderName] = useState('—')
  const [expertName, setExpertName] = useState('—')

  useEffect(() => {
    if (state.lenderId) {
      fetch('/api/finance/partners')
        .then((r) => r.json())
        .then((body) => {
          const found = (body.data as Partner[] | undefined)?.find((p) => p.id === state.lenderId)
          if (found) setLenderName(found.name)
        })
        .catch(() => undefined)
    }
    if (state.expertId) {
      fetch('/api/admin/experts')
        .then((r) => r.json())
        .then((body) => {
          const found = (body.data as Expert[] | undefined)?.find((e) => e.id === state.expertId)
          if (found) setExpertName(found.full_name)
        })
        .catch(() => undefined)
    }
  }, [state.lenderId, state.expertId])

  const smsPreview = `Karibu AgroConnect! ${state.fullName || '[Jina]'}, akaunti yako imefunguliwa.\nNambari ya simu: ${
    state.phone || '[Simu]'
  }. PIN ya mara ya kwanza: 1234.\nBadilisha PIN yako mara ya kwanza kuingia.\nApp: agroconnect.app au piga *384# kwa USSD.`

  async function handleCreate() {
    setSubmitting(true)
    try {
      const userRes = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: state.phone.trim(),
          password: 'Agro1234',
          fullName: state.fullName.trim(),
          role: 'farmer',
          county: state.county,
          language: state.language,
        }),
      })
      const userBody = await userRes.json()
      if (!userRes.ok) throw new Error(userBody?.message ?? 'Failed to create user account')
      const userId: string = userBody.data?.id ?? userBody.id
      if (!userId) throw new Error('User creation did not return an id')

      const farmRes = await fetch('/api/farm/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userId,
          name: state.farmName,
          locationLat: Number(state.gpsLat),
          locationLng: Number(state.gpsLng),
          county: state.county,
          subCounty: state.subCounty || undefined,
          areaAcres: Number(state.areaAcres),
          soilType: state.soilType || undefined,
          waterSource: state.waterSource || undefined,
        }),
      })
      const farmBody = await farmRes.json()
      if (!farmRes.ok) throw new Error(farmBody?.message_key ?? 'Failed to create farm')
      const farmId: string = farmBody.data?.id

      for (const plot of state.plots) {
        if (!plot.crop || !plot.plantingDate) continue
        await fetch(`/api/farm/farms/${farmId}/plots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: plot.plotName || 'Plot 1',
            areaAcres: Number(plot.plotSize) || Number(state.areaAcres),
            currentCrop: plot.crop,
            currentCropPlantedAt: plot.plantingDate,
          }),
        })
      }

      if (state.lenderId) {
        await fetch(`/api/finance/farmers/${userId}/lender`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lenderId: state.lenderId }),
        })
      }

      if (state.expertId) {
        await fetch(`/api/admin/farmers/${userId}/expert`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expertId: state.expertId }),
        })
      }

      update({ createdUserId: userId })
      toast.success(`${state.fullName}'s account created. SMS sent to ${state.phone}.`)
      router.push('/admin/users/new/farmer/success')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <FormSection title="Account Summary">
        <InfoRow label="Role" value="Farmer" />
        <InfoRow label="Full Name" value={state.fullName} />
        <InfoRow label="Phone" value={state.phone} />
        <InfoRow label="National ID" value={state.nationalId} />
        <InfoRow label="County / Sub-county" value={`${state.county} — ${state.subCounty}`} />
        <InfoRow label="Language" value={state.language === 'sw' ? 'Kiswahili' : 'English'} />
        <InfoRow label="Crops" value={state.crops.join(', ') || '—'} />
        <InfoRow label="Livestock" value={state.livestockTypes.join(', ') || '—'} />
      </FormSection>

      <FormSection title="Farm Summary">
        <InfoRow label="Farm Name" value={state.farmName} />
        <InfoRow label="Total Area" value={`${state.areaAcres} acres`} />
        <InfoRow label="GPS" value={`${state.gpsLat}, ${state.gpsLng} ✓ Verified`} />
        <InfoRow label="Water Source" value={state.waterSource} />
        <InfoRow label="Soil Type" value={state.soilType || '—'} />
        {state.plots.map((p, i) => (
          <InfoRow
            key={p.id}
            label={p.plotName || `Plot ${i + 1}`}
            value={`${p.crop || '—'} · ${p.plotSize || '—'} acres · planted ${p.plantingDate || '—'}`}
          />
        ))}
        <AlertBox variant="green">
          AI activity schedules will be generated automatically for each plot on creation.
        </AlertBox>
      </FormSection>

      <FormSection title="Assignments">
        <InfoRow label="Lender" value={lenderName} />
        <InfoRow label="Extension Officer / Vet" value={expertName} />
      </FormSection>

      <FormSection title="SMS to be sent on creation">
        <pre className="whitespace-pre-wrap rounded-base bg-ac-green-light p-3 text-sm text-ac-green-dark">
          {smsPreview}
        </pre>
        <AlertBox variant="green">
          PIN must be changed on first login. Account is locked after 3 failed attempts.
        </AlertBox>
      </FormSection>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push('/admin/users/new/farmer/5')}
          className="rounded-md border border-border px-3.5 py-2 text-base font-semibold text-muted"
        >
          ← Back to Assignments
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleCreate}
          className="rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Creating…' : '✅ Create Account & Send SMS'}
        </button>
      </div>
    </div>
  )
}
