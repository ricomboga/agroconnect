'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FormSection, AlertBox } from '@agroconnect/web-ui'
import { useFarmerCreation } from '../../_context/FarmerCreationContext'

interface Partner {
  id: string
  name: string
  type: string
  maxLoanKes: number
  activeFarmers: number
  repaymentRatePct: number
  interestRateAnnual: number
}

interface Expert {
  id: string
  full_name: string
  county: string
  type: string
  current_farmers: number
  max_farmers: number
  rating_avg: number
  rating_count: number
}

function cardCls(selected: boolean) {
  return `w-full rounded-base border p-3 text-left transition-colors ${
    selected ? 'border-ac-green bg-ac-green-light' : 'border-border bg-white hover:bg-surface2'
  }`
}

export default function FarmerStep5Page() {
  const router = useRouter()
  const { state, update } = useFarmerCreation()
  const [partners, setPartners] = useState<Partner[]>([])
  const [experts, setExperts] = useState<Expert[]>([])
  const [expertCountyFilter, setExpertCountyFilter] = useState(state.county)

  useEffect(() => {
    fetch('/api/finance/partners')
      .then((r) => r.json())
      .then((body) => setPartners(body.data ?? []))
      .catch(() => setPartners([]))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (expertCountyFilter) params.set('county', expertCountyFilter)
    fetch(`/api/admin/experts?${params.toString()}`)
      .then((r) => r.json())
      .then((body) => setExperts(body.data ?? []))
      .catch(() => setExperts([]))
  }, [expertCountyFilter])

  return (
    <div>
      <FormSection title="🏦 Assign Lending Partner">
        <AlertBox variant="blue">
          Loan applications from this farmer will be auto-routed to the assigned lender. Optional —
          the farmer can also select a lender at loan application time.
        </AlertBox>

        <div className="flex flex-col gap-2">
          {partners.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ lenderId: p.id })}
              className={cardCls(state.lenderId === p.id)}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-base font-bold text-ink">{p.name}</span>
                {state.lenderId === p.id && (
                  <span className="text-sm font-semibold text-ac-green">✓ Selected</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-muted">
                <div>
                  <div className="font-bold text-ink">{p.activeFarmers.toLocaleString()}</div>
                  Farmers
                </div>
                <div>
                  <div className="font-bold text-ink">{p.repaymentRatePct}%</div>
                  Repayment
                </div>
                <div>
                  <div className="font-bold text-ink">KES {p.maxLoanKes.toLocaleString()}</div>
                  Max loan · {p.interestRateAnnual}% p.a.
                </div>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => update({ lenderId: null })}
            className="w-full rounded-base border border-dashed border-border p-2.5 text-sm font-semibold text-muted"
          >
            Skip — farmer selects lender at loan application time
          </button>
        </div>
      </FormSection>

      <FormSection title="🩺 Assign Extension Officer / Vet">
        <AlertBox variant="amber">
          Strongly recommended. This expert reviews low-confidence AI diagnoses, answers community
          Q&amp;A, and may conduct farm visits.
        </AlertBox>

        <select
          value={expertCountyFilter}
          onChange={(e) => setExpertCountyFilter(e.target.value)}
          className="w-fit rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base"
        >
          <option value="">All Counties</option>
          <option value={state.county}>{state.county} (farmer&apos;s county)</option>
        </select>

        <div className="flex flex-col gap-2">
          {experts.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => update({ expertId: e.id })}
              className={cardCls(state.expertId === e.id)}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-base font-bold text-ink">{e.full_name}</span>
                {state.expertId === e.id && (
                  <span className="text-sm font-semibold text-ac-green">✓ Selected</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-muted">
                <div>
                  <div className="font-bold text-ink">
                    {e.current_farmers}/{e.max_farmers}
                  </div>
                  Capacity
                </div>
                <div>
                  <div className="font-bold text-ink">{e.rating_avg.toFixed(1)}★</div>
                  Rating ({e.rating_count})
                </div>
                <div>
                  <div className="font-bold text-ink">{e.county}</div>
                  County
                </div>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => update({ expertId: null })}
            className="w-full rounded-base border border-dashed border-border p-2.5 text-sm font-semibold text-muted"
          >
            Skip — no expert assigned
          </button>
        </div>
      </FormSection>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push('/admin/users/new/farmer/4')}
          className="rounded-md border border-border px-3.5 py-2 text-base font-semibold text-muted"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/users/new/farmer/6')}
          className="rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white"
        >
          Next: Review &amp; Create →
        </button>
      </div>
    </div>
  )
}
