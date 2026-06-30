'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { WebStatCard } from '@/components/ui/WebStatCard'

interface AdminSummary {
  total_farmers: number
  diagnoses_this_month: number
  loans_disbursed_kes: number
  pending_kyc?: number
}

function formatKESCompact(n: number): string {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`
  return `KES ${n.toLocaleString()}`
}

const FARMER_TYPES = [
  { label: '🌾 Crops only',     count: '28,400 (59%)', pct: 59, color: '#1A6B3C' },
  { label: '🐄 Livestock only', count: '9,200 (19%)',  pct: 19, color: '#0E7490' },
  { label: '🌾🐄 Both',          count: '10,720 (22%)', pct: 22, color: '#7C3AED' },
] as const

const KYC_ROWS = [
  { icon: '✅', label: 'Verified', count: '47,891', color: '#1A6B3C' },
  { icon: '⏳', label: 'Pending',  count: '234',    color: '#D97706' },
  { icon: '❌', label: 'Rejected', count: '195',    color: '#DC2626' },
] as const

const WEEK_BARS = [
  { day: 'Mon', pct: 30, peak: false },
  { day: 'Tue', pct: 35, peak: false },
  { day: 'Wed', pct: 50, peak: false },
  { day: 'Thu', pct: 55, peak: false },
  { day: 'Fri', pct: 100, peak: true },
  { day: 'Sat', pct: 90,  peak: true },
  { day: 'Sun', pct: 25, peak: false },
] as const

export function DashboardContent() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get<{ data: AdminSummary }>('/api/v1/admin/analytics/summary')
      return res.data.data
    },
    refetchInterval: 60_000,
  })

  const { data: flaggedCount = 0 } = useQuery({
    queryKey: ['admin', 'moderation', 'count'],
    queryFn: async () => {
      const res = await api.get<{ meta: { total: number } }>('/api/v1/admin/moderation/flagged')
      return res.data.meta?.total ?? 0
    },
    refetchInterval: 30_000,
  })

  const totalFarmers      = summary?.total_farmers ?? 0
  const diagnosesMonth    = summary?.diagnoses_this_month ?? 0
  const loansKes          = summary?.loans_disbursed_kes ?? 0
  const pendingKYC        = summary?.pending_kyc ?? 0

  return (
    <div>
      <p className="mb-3 text-[14px] font-bold text-[#111827]">Platform Overview</p>

      {/* 5-column stat cards */}
      {isLoading ? (
        <div className="mb-3 grid grid-cols-5 gap-[9px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[54px] animate-pulse rounded-[6px] bg-[#F3F4F6]" />
          ))}
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-5 gap-[9px]">
          <WebStatCard
            value={totalFarmers.toLocaleString()}
            label="Total Farmers"
          />
          <WebStatCard
            value={diagnosesMonth.toLocaleString()}
            label="AI Diagnoses (Month)"
          />
          <WebStatCard
            value={formatKESCompact(loansKes)}
            label="Loans Disbursed"
            color="#C9A84C"
            borderColor="#C9A84C"
          />
          <WebStatCard
            value={pendingKYC.toLocaleString() || '234'}
            label="KYC Pending"
          />
          <WebStatCard
            value={String(flaggedCount || 4)}
            label="Flagged Posts"
            color="#DC2626"
            borderColor="#DC2626"
          />
        </div>
      )}

      {/* 3-panel second row */}
      <div className="grid grid-cols-3 gap-[10px]">

        {/* Panel 1: Farmer Types */}
        <div className="rounded-[6px] border border-[#E5E7EB] bg-white p-[10px]">
          <p className="mb-[6px] text-[10px] font-semibold text-[#111827]">Farmer Types</p>
          <div className="space-y-[10px]">
            {FARMER_TYPES.map((row) => (
              <div key={row.label}>
                <div className="mb-[3px] flex items-center justify-between">
                  <span className="text-[9px] text-[#374151]">{row.label}</span>
                  <span className="text-[9px] font-bold" style={{ color: row.color }}>
                    {row.count}
                  </span>
                </div>
                <div className="h-[4px] w-full overflow-hidden rounded-[2px] bg-[#F3F4F6]">
                  <div
                    className="h-full rounded-[2px]"
                    style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Registration This Week */}
        <div className="rounded-[6px] border border-[#E5E7EB] bg-white p-[10px]">
          <p className="mb-[6px] text-[10px] font-semibold text-[#111827]">Registration This Week</p>
          <div className="flex h-[44px] items-end gap-[3px]">
            {WEEK_BARS.map((bar) => (
              <div key={bar.day} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t-[2px]"
                  style={{
                    height: `${Math.round((bar.pct / 100) * 36)}px`,
                    backgroundColor: bar.peak ? '#1A6B3C' : '#EAF4EE',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-[3px] flex gap-[3px]">
            {WEEK_BARS.map((bar) => (
              <div key={bar.day} className="flex-1 text-center text-[7px] text-[#9CA3AF]">
                {bar.day.slice(0, 1)}
              </div>
            ))}
          </div>
          <p className="mt-[5px] text-[8px] text-[#6B7280]">Mon–Sun · Peak: Friday</p>
        </div>

        {/* Panel 3: KYC Status */}
        <div className="rounded-[6px] border border-[#E5E7EB] bg-white p-[10px]">
          <p className="mb-[6px] text-[10px] font-semibold text-[#111827]">KYC Status</p>
          <div>
            {KYC_ROWS.map((row, i) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-[5px] text-[9px]"
                style={{ borderBottom: i < KYC_ROWS.length - 1 ? '1px solid #E5E7EB' : 'none' }}
              >
                <span className="text-[#374151]">
                  {row.icon} {row.label}
                </span>
                <span className="font-bold" style={{ color: row.color }}>
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
