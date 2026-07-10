'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { WebDataTable } from '@/components/ui/WebDataTable'

interface Farm {
  id: string
  name: string
  county: string
  size_acres: number
  crops: string[]
  status: string
}

interface FarmsResponse {
  data: Farm[]
}

const COLUMNS = [
  { key: 'name',       header: 'Farm Name',  width: '25%' },
  { key: 'county',     header: 'County',     width: '18%' },
  { key: 'size_acres', header: 'Acreage',    width: '12%' },
  { key: 'crops',      header: 'Crops',      width: '30%' },
  { key: 'status',     header: 'Status',     width: '15%' },
]

interface FarmerFarmsTabProps {
  farmerId: string
}

export function FarmerFarmsTab({ farmerId }: FarmerFarmsTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'farms', farmerId],
    queryFn: async () => {
      const res = await api.get<FarmsResponse>(`/api/v1/farms?farmer_id=${farmerId}`)
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-[#F3F4F6]" />
        ))}
      </div>
    )
  }

  const farms = data ?? []

  if (farms.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#6B7280]">
        No farms registered
      </div>
    )
  }

  const rows = farms.map((f) => ({
    name: <span className="font-medium text-[#111827]">{f.name}</span>,
    county: f.county,
    size_acres: `${f.size_acres} ac`,
    crops: f.crops.length > 0 ? f.crops.join(', ') : '—',
    status: (
      <span className={f.status === 'active' ? 'w-badge-green' : 'w-badge-amber'}>
        {f.status}
      </span>
    ),
  }))

  return <WebDataTable columns={COLUMNS} data={rows} />
}
