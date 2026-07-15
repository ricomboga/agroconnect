'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import api from '@/lib/api'
import { KpiCard } from '@agroconnect/web-ui'

interface WeeklyRegistration {
  date: string
  count: number
}

interface KycBreakdownRow {
  status: string
  count: number
}

interface CountyFarmerCount {
  county: string
  count: number
}

interface AnalyticsSummary {
  total_farmers: number
  total_farms: number
  diagnoses_this_month: number
  loans_disbursed_kes: number
  active_listings: number
  pending_kyc: number
  farms_health_below_50: number
  kyc_breakdown: KycBreakdownRow[]
  weekly_registrations: WeeklyRegistration[]
  farmers_by_county: CountyFarmerCount[]
}

const KYC_COLORS: Record<string, string> = {
  pending: '#D97706',
  submitted: '#1D4ED8',
  verified: '#1A6B3C',
  rejected: '#DC2626',
}

const KYC_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  verified: 'Verified',
  rejected: 'Rejected',
}

function formatDayLabel(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-KE', { weekday: 'short', timeZone: 'UTC' })
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsSummary }>('/api/v1/admin/analytics/summary')
      return res.data.data
    },
  })

  const weeklyBars = (data?.weekly_registrations ?? []).map((row) => ({
    day: formatDayLabel(row.date),
    date: row.date,
    Registrations: row.count,
  }))

  const kycSlices = (data?.kyc_breakdown ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({
      name: KYC_LABELS[row.status] ?? row.status,
      value: row.count,
      color: KYC_COLORS[row.status] ?? '#6B7280',
    }))

  const allCounties = data?.farmers_by_county ?? []
  const sortedCounties = [...allCounties].sort((a, b) => b.count - a.count)
  const countyBars = sortedCounties.map((row) => ({ county: row.county, Farmers: row.count })).reverse()
  const shownFarmerCount = sortedCounties.reduce((sum, row) => sum + row.count, 0)

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
          <p className="mb-2 text-md font-semibold text-ink">Farmer Registrations (Last 7 Days)</p>
          {weeklyBars.every((b) => b.Registrations === 0) ? (
            <p className="py-8 text-center text-sm text-muted">No new registrations this week</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} />
                <Bar dataKey="Registrations" fill="#1A6B3C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-base border border-border bg-white px-4 py-3">
          <p className="mb-2 text-md font-semibold text-ink">Farmer KYC Status</p>
          {kycSlices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No farmer accounts yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={kycSlices} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {kycSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="col-span-2 rounded-base border border-border bg-white px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-md font-semibold text-ink">Farmers by County</p>
            <p className="text-xs text-muted">
              {shownFarmerCount} of {data?.total_farmers ?? 0} farmers · {sortedCounties.length} counties
            </p>
          </div>
          {countyBars.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No farmer accounts yet</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <ResponsiveContainer width="100%" height={Math.max(180, countyBars.length * 30)}>
                <BarChart data={countyBars} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="county" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="Farmers" fill="#0E7490" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
