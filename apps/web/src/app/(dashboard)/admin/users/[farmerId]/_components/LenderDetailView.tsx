'use client'

import { useQuery } from '@tanstack/react-query'
import { WebStatCard } from '@/components/ui/WebStatCard'
import { AlertBox } from '@agroconnect/web-ui'

interface LenderSummary {
  institution: { id: string; name: string; type: string; repaymentRatePct: number }
  farmersCount: number
  counts: {
    submitted: number
    under_review: number
    approved: number
    disbursed: number
    rejected: number
    repaid: number
    defaulted: number
    cancelled: number
  }
  totalDisbursedKes: number
}

function kes(amount: number): string {
  return `KES ${amount.toLocaleString()}`
}

interface Props {
  partnerBankId: string | null | undefined
}

export function LenderDetailView({ partnerBankId }: Props) {
  const summaryQuery = useQuery({
    queryKey: ['admin', 'lender-summary', partnerBankId],
    enabled: !!partnerBankId,
    queryFn: async () => {
      const res = await fetch(`/api/finance/admin/lenders/${partnerBankId}/summary`)
      if (!res.ok) throw new Error('Failed to load lender summary')
      const body = await res.json() as { data: LenderSummary }
      return body.data
    },
  })

  if (!partnerBankId) {
    return <AlertBox variant="blue">This lender account is not yet assigned to a lending institution.</AlertBox>
  }

  if (summaryQuery.isLoading) {
    return (
      <div className="grid grid-cols-4 gap-[7px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[54px] animate-pulse rounded-lg bg-[#F3F4F6]" />
        ))}
      </div>
    )
  }

  const summary = summaryQuery.data
  if (!summary) {
    return <AlertBox variant="red">Could not load this lender&apos;s institution data.</AlertBox>
  }

  const { institution, farmersCount, counts, totalDisbursedKes } = summary

  return (
    <div>
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          padding: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, color: '#111827' }}>
          {institution.name} <span style={{ color: '#6B7280', fontWeight: 400 }}>({institution.type})</span>
        </div>
        <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>
          Repayment rate: {institution.repaymentRatePct}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
        <WebStatCard value={farmersCount} label="Farmers Registered" />
        <WebStatCard value={counts.submitted + counts.under_review} label="Loans Applied / Under Review" />
        <WebStatCard value={counts.disbursed} label="Disbursed" color="#0E7490" />
        <WebStatCard value={kes(totalDisbursedKes)} label="Total Disbursed" color="#C9A84C" borderColor="#C9A84C" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
        <WebStatCard value={counts.approved} label="Approved" />
        <WebStatCard value={counts.rejected} label="Rejected" color="#DC2626" />
        <WebStatCard value={counts.repaid} label="Repaid" color="#0D4A28" />
        <WebStatCard value={counts.defaulted} label="Defaulted" color="#DC2626" />
      </div>
    </div>
  )
}
