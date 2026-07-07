'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { WebStatCard } from '@/components/ui/WebStatCard'
import { WebDataTable } from '@/components/ui/WebDataTable'
import { AlertBox } from '@agroconnect/web-ui'
import { exportFarmerReportCsv } from '../_lib/exportFarmerReport'

interface Farm {
  id: string
  name: string
  county: string
  size_acres: number
  crops: string[]
  status: string
  last_activity_date: string | null
}

interface MonthlyTotal {
  month: string
  incomeKes: number
  expenseKes: number
  netKes: number
}

interface MonthlyYield {
  month: string
  harvestedKg: number
}

interface FarmerReport {
  transactions: {
    netKes: number
    byMonth: MonthlyTotal[]
  }
  production: {
    monthlyYieldKg: MonthlyYield[]
  }
  creditScore: {
    score: number
    band: string
    maxLoanKes: number
    breakdown: {
      harvestYieldScore: number
      inputManagementScore: number
      activityComplianceScore: number
      platformEngagementScore: number
    }
    computedAt: string
  } | null
}

const ACTIVITY_COLS = [
  { key: 'activity', header: 'Activity', width: '30%' },
  { key: 'crop',     header: 'Crop',     width: '25%' },
  { key: 'date',     header: 'Date',     width: '22%' },
  { key: 'status',   header: 'Status',   width: '23%' },
]

const ACTIVITY_ROWS = [
  {
    activity: '💧 Watering',
    crop: 'Maize',
    date: 'Jun 5',
    status: <span className="w-badge-green">✓ Done</span>,
  },
  {
    activity: '🌿 Spraying',
    crop: 'Tomato',
    date: 'Jun 6',
    status: <span className="w-badge-amber">Today</span>,
  },
  {
    activity: '✂️ Weeding',
    crop: 'Beans',
    date: 'Jul 15',
    status: <span className="w-badge-blue">Upcoming</span>,
  },
]

const LIVESTOCK_ITEMS = [
  { label: '🐔 Chickens',  value: '50' },
  { label: '🐄 Cattle',    value: '4' },
  { label: '🥚 Eggs Today', value: 'Tray 6.5' },
  { label: '🥛 Milk Today', value: '28L' },
]

const SCORE_LABELS: Record<string, string> = {
  harvestYieldScore: 'Harvest Yield',
  inputManagementScore: 'Input Use',
  activityComplianceScore: 'Activity Score',
  platformEngagementScore: 'Platform Use',
}

export function farmTypeInfo(role: string): { emojis: string; label: string; hasAnimals: boolean } {
  const hasAnimal = role.includes('animal')
  const hasCrop   = role.includes('crop')
  if (hasAnimal && !hasCrop) return { emojis: '🐄',    label: 'Animals',        hasAnimals: true  }
  if (hasCrop   && !hasAnimal) return { emojis: '🌾',  label: 'Crops',          hasAnimals: false }
  return                               { emojis: '🌾🐄', label: 'Crops + Animals', hasAnimals: true  }
}

function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString()}`
}

interface Props {
  farmerId: string
  role: string
}

export function FarmerDetailView({ farmerId, role }: Props) {
  const farmsQuery = useQuery({
    queryKey: ['admin', 'farms', farmerId],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms?farmer_id=${farmerId}`)
      if (!res.ok) throw new Error('Failed to load farms')
      const body = await res.json() as { data: Farm[] }
      return body.data
    },
  })

  const reportQuery = useQuery({
    queryKey: ['admin', 'farmer-report', farmerId],
    queryFn: async () => {
      const res = await fetch(`/api/finance/admin/farmers/${farmerId}/report`)
      if (!res.ok) return null
      const body = await res.json() as { data: FarmerReport }
      return body.data
    },
  })

  const farms = farmsQuery.data ?? []
  const report = reportQuery.data
  const creditScore = report?.creditScore ?? null
  const ft = farmTypeInfo(role)

  return (
    <div>
      {/* Stat Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
        <WebStatCard value={farms.length} label="Farms" />
        <WebStatCard value={19} label="Activities (Month)" />
        <WebStatCard
          value={creditScore ? creditScore.score : '—'}
          label="Credit Score"
          color="#C9A84C"
          borderColor="#C9A84C"
        />
        <WebStatCard
          value={report ? formatKes(report.transactions.netKes) : '—'}
          label="Net Profit (12mo)"
          color="#0E7490"
        />
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {/* Left: Recent Activities */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            padding: 10,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
            Recent Activities
          </div>
          <WebDataTable columns={ACTIVITY_COLS} data={ACTIVITY_ROWS} />
        </div>

        {/* Right: Livestock (conditional) */}
        {ft.hasAnimals && (
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              Livestock / Animals
            </div>
            {LIVESTOCK_ITEMS.map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 9,
                  color: '#374151',
                  padding: '4px 0',
                  borderBottom: '1px solid #E5E7EB',
                }}
              >
                <span>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit Score Detail */}
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          padding: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Credit Score Breakdown
        </div>
        {!creditScore ? (
          <AlertBox variant="blue">Credit score not yet computed for this farmer.</AlertBox>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(creditScore.breakdown).map(([key, value]) => (
              <div key={key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 9,
                    color: '#374151',
                    marginBottom: 3,
                  }}
                >
                  <span>{SCORE_LABELS[key] ?? key}</span>
                  <span style={{ fontWeight: 600 }}>{value} / 25</span>
                </div>
                <div className="w-score-bar">
                  <div
                    className="w-score-fill"
                    style={{ width: `${(value / 25) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial & Yield Trends */}
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          padding: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#111827' }}>
            Financial &amp; Yield Trends (Last 12 Months)
          </div>
          {report && (
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-ink2"
              onClick={() => exportFarmerReportCsv(farmerId, report)}
            >
              Download Raw Data (CSV)
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Income vs Expenses
            </div>
            {!report || report.transactions.byMonth.length === 0 ? (
              <p style={{ fontSize: 9, color: '#6B7280' }}>No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.transactions.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="incomeKes" name="Income (KES)" fill="#1A6B3C" />
                  <Bar dataKey="expenseKes" name="Expense (KES)" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Harvest Yield
            </div>
            {!report || report.production.monthlyYieldKg.length === 0 ? (
              <p style={{ fontSize: 9, color: '#6B7280' }}>No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.production.monthlyYieldKg}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="harvestedKg" name="Harvested (kg)" fill="#C9A84C" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
