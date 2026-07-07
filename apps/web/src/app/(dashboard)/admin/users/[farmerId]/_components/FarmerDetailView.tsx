'use client'

import { useQuery } from '@tanstack/react-query'
import { WebStatCard } from '@/components/ui/WebStatCard'
import { WebDataTable } from '@/components/ui/WebDataTable'

interface Farm {
  id: string
  name: string
  county: string
  size_acres: number
  crops: string[]
  status: string
  last_activity_date: string | null
}

interface CreditScore {
  score: number
  band: 'A' | 'B' | 'C' | 'D'
  max_loan_kes: number
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

const SCORE_COMPONENTS = [
  { label: 'Harvest Yield',  score: 21, max: 25 },
  { label: 'Input Use',      score: 18, max: 25 },
  { label: 'Activity Score', score: 20, max: 25 },
  { label: 'Platform Use',   score: 14, max: 25 },
]

export function farmTypeInfo(role: string): { emojis: string; label: string; hasAnimals: boolean } {
  const hasAnimal = role.includes('animal')
  const hasCrop   = role.includes('crop')
  if (hasAnimal && !hasCrop) return { emojis: '🐄',    label: 'Animals',        hasAnimals: true  }
  if (hasCrop   && !hasAnimal) return { emojis: '🌾',  label: 'Crops',          hasAnimals: false }
  return                               { emojis: '🌾🐄', label: 'Crops + Animals', hasAnimals: true  }
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

  const scoreQuery = useQuery({
    queryKey: ['admin', 'credit-score', farmerId],
    queryFn: async () => {
      const res = await fetch(`/api/finance/finance/credit-score?user_id=${farmerId}`)
      if (!res.ok) return null
      const body = await res.json() as { data: CreditScore }
      return body.data
    },
  })

  const farms = farmsQuery.data ?? []
  const score = scoreQuery.data
  const ft = farmTypeInfo(role)

  return (
    <div>
      {/* Stat Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
        <WebStatCard value={farms.length} label="Farms" />
        <WebStatCard value={19} label="Activities (Month)" />
        <WebStatCard
          value={score ? score.score : '—'}
          label="Credit Score"
          color="#C9A84C"
          borderColor="#C9A84C"
        />
        <WebStatCard value="KES 24,300" label="Net Profit (June)" color="#0E7490" />
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
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Credit Score Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCORE_COMPONENTS.map((comp) => (
            <div key={comp.label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 9,
                  color: '#374151',
                  marginBottom: 3,
                }}
              >
                <span>{comp.label}</span>
                <span style={{ fontWeight: 600 }}>{comp.score} / {comp.max}</span>
              </div>
              <div className="w-score-bar">
                <div
                  className="w-score-fill"
                  style={{ width: `${(comp.score / comp.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
