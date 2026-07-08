'use client'

import { useQuery } from '@tanstack/react-query'
import { ProgressBar, AlertBox, KpiCard } from '@agroconnect/web-ui'

interface Institution {
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
}

interface RiskData {
  repaymentByBand?: { band: string; ratePct: number; farmers: number }[]
  monthlyDisbursements?: { month: string; amountKes: number }[]
  impact?: { avgYieldImprovementPct: number; farmersWithActiveCropPct: number; repeatApplicationPct: number }
}

function bandColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 85) return 'green'
  if (pct >= 65) return 'amber'
  return 'red'
}

export function RiskAnalyticsView() {
  const { data: institution } = useQuery({
    queryKey: ['lender', 'institution'],
    queryFn: async () => {
      const res = await fetch('/api/lender/institution')
      if (!res.ok) return null
      const body = (await res.json()) as { data: Institution }
      return body.data
    },
  })
  const isNgo = institution?.type === 'ngo_grant'

  const { data } = useQuery({
    queryKey: ['lender', 'risk'],
    queryFn: async () => {
      const res = await fetch('/api/lender/risk')
      if (!res.ok) throw new Error('Failed to load analytics')
      const body = (await res.json()) as { data: RiskData }
      return body.data
    },
    enabled: institution !== undefined,
  })

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">{isNgo ? 'Impact Analytics' : 'Risk Analytics'}</p>
        <p className="mt-0.5 text-sm text-muted">
          {isNgo ? 'Programme outcomes across grant recipients' : 'Repayment performance and disbursement trends'}
        </p>
      </div>

      {isNgo ? (
        <div className="grid grid-cols-3 gap-2.5">
          <KpiCard variant="green" value={`${data?.impact?.avgYieldImprovementPct ?? '—'}%`} label="Avg Yield Improvement" />
          <KpiCard variant="teal" value={`${data?.impact?.farmersWithActiveCropPct ?? '—'}%`} label="Farmers w/ Active Crop Post-Grant" />
          <KpiCard variant="gold" value={`${data?.impact?.repeatApplicationPct ?? '—'}%`} label="Repeat Grant Applications" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          <div className="rounded-base border border-border bg-white px-4 py-3">
            <p className="mb-3 text-md font-semibold text-ink">Repayment Rate by Credit Band</p>
            <div className="flex flex-col gap-2.5">
              {(data?.repaymentByBand ?? []).map((b) => (
                <div key={b.band}>
                  <div className="mb-0.5 flex items-center justify-between text-sm">
                    <span>Band {b.band} ({b.farmers} farmers)</span>
                    <span className="font-semibold text-ink">{b.ratePct}%</span>
                  </div>
                  <ProgressBar value={b.ratePct} color={bandColor(b.ratePct)} />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <AlertBox variant="blue">
                Band D farmers show the steepest repayment drop-off. Consider capping new
                disbursements to Band D at 50,000 KES until repayment history improves.
              </AlertBox>
            </div>
          </div>

          <div className="rounded-base border border-border bg-white px-4 py-3">
            <p className="mb-3 text-md font-semibold text-ink">Monthly Disbursements</p>
            <div className="flex h-32 items-end gap-2">
              {(data?.monthlyDisbursements ?? []).map((m) => {
                const max = Math.max(...(data?.monthlyDisbursements ?? []).map((x) => x.amountKes), 1)
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t-[3px] bg-ac-green" style={{ height: `${(m.amountKes / max) * 100}%` }} />
                    <span className="text-xs text-muted">{m.month}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3">
              <AlertBox variant="amber">
                Disbursements typically dip in April. Plan liquidity ahead of the long-rains
                planting season demand spike in May.
              </AlertBox>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
