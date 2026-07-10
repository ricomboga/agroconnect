'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { WebDataTable } from '@/components/ui/WebDataTable'

interface Activity {
  id: string
  farm_name: string
  type: string
  subject_name: string
  scheduled_date: string
  duration_hours: number | null
  cost_kes: number | null
  status: 'done' | 'overdue' | 'upcoming'
}

interface ActivitiesResponse {
  data: Activity[]
}

const COLS = [
  { key: 'date',     header: 'Date',         width: '15%' },
  { key: 'farm',     header: 'Farm',         width: '18%' },
  { key: 'type',     header: 'Type',         width: '18%' },
  { key: 'subject',  header: 'Crop / Animal',width: '18%' },
  { key: 'duration', header: 'Duration',     width: '12%' },
  { key: 'cost',     header: 'Cost (KES)',   width: '12%' },
  { key: 'status',   header: 'Status',       width: '7%' },
]

const STATUS_CLASS: Record<string, string> = {
  done:     'w-badge-green',
  overdue:  'w-badge-red',
  upcoming: 'w-badge-blue',
}

function thirtyDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

interface FarmerActivityTabProps {
  farmerId: string
}

export function FarmerActivityTab({ farmerId }: FarmerActivityTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'activities', farmerId],
    queryFn: async () => {
      const from = thirtyDaysAgo()
      const res = await api.get<ActivitiesResponse>(
        `/api/v1/farms/activities?farmer_id=${farmerId}&from_date=${from}`,
      )
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-[#F3F4F6]" />
        ))}
      </div>
    )
  }

  const activities = data ?? []

  if (activities.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#6B7280]">
        No activities in the last 30 days
      </div>
    )
  }

  const rows = activities.map((a) => ({
    date: new Date(a.scheduled_date).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
    }),
    farm: a.farm_name,
    type: a.type,
    subject: a.subject_name,
    duration: a.duration_hours != null ? `${a.duration_hours}h` : '—',
    cost: a.cost_kes != null ? a.cost_kes.toLocaleString() : '—',
    status: (
      <span className={STATUS_CLASS[a.status] ?? 'w-badge-blue'}>{a.status}</span>
    ),
  }))

  return <WebDataTable columns={COLS} data={rows} />
}
