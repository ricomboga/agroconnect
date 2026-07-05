'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { KpiCard, ProgressBar } from '@agroconnect/web-ui'

interface AnalyticsSummary {
  total_farmers: number
  total_farms: number
  diagnoses_this_month: number
  loans_disbursed_kes: number
  active_listings: number
  pending_kyc: number
  farms_health_below_50: number
}

const WEEK_BARS = [
  { day: 'Mon', pct: 30 },
  { day: 'Tue', pct: 35 },
  { day: 'Wed', pct: 50 },
  { day: 'Thu', pct: 55 },
  { day: 'Fri', pct: 100 },
  { day: 'Sat', pct: 90 },
  { day: 'Sun', pct: 25 },
] as const

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsSummary }>('/api/v1/admin/analytics/summary')
      return res.data.data
    },
  })

  const { data: farmsData } = useQuery({
    queryKey: ['admin', 'farms', 'top-counties'],
    queryFn: async () => {
      const res = await api.get<{ data: { county: string }[] }>('/api/v1/admin/farms?page_size=100')
      return res.data.data
    },
  })

  const countyCounts = (farmsData ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.county] = (acc[f.county] ?? 0) + 1
    return acc
  }, {})
  const topCounties = Object.entries(countyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCounty = topCounties[0]?.[1] ?? 1

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Platform Analytics</p>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="mb-4 grid grid-cols-5 gap-2.5">
          <KpiCard variant="green" value={data?.total_farmers ?? 0} label="Total Farmers" />
          <KpiCard variant="teal" value={data?.total_farms ?? 0} label="Total Farms" />
          <KpiCard variant="amber" value={data?.pending_kyc ?? 0} label="KYC Pending" />
          <KpiCard variant="red" value={data?.farms_health_below_50 ?? 0} label="Farm Health < 50%" />
          <KpiCard variant="blue" value={data?.active_listings ?? 0} label="Active Listings" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-base border border-border bg-white px-4 py-3">
          <p className="mb-2 text-md font-semibold text-ink">Weekly Registrations</p>
          <div className="flex h-16 items-end gap-1.5">
            {WEEK_BARS.map((bar) => (
              <div key={bar.day} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t-sm bg-ac-green-light"
                  style={{ height: `${Math.round((bar.pct / 100) * 56)}px` }}
                />
                <span className="mt-1 text-xs text-muted">{bar.day[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-base border border-border bg-white px-4 py-3">
          <p className="mb-2 text-md font-semibold text-ink">Top Counties by Farm Count</p>
          <div className="flex flex-col gap-2">
            {topCounties.map(([county, count]) => (
              <div key={county}>
                <div className="mb-0.5 flex justify-between text-sm">
                  <span className="text-ink2">{county}</span>
                  <span className="font-semibold text-ink">{count}</span>
                </div>
                <ProgressBar value={(count / maxCounty) * 100} color="green" />
              </div>
            ))}
            {topCounties.length === 0 && <p className="text-sm text-muted">No farm data yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
