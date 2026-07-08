'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2 } from 'lucide-react'
import type { Farm } from './FarmDetailClient'

interface Activity {
  id: string
  type: string
  title: string
  scheduledDate: string
  status: 'pending' | 'completed' | 'skipped'
  assignedWorker?: { fullName: string } | null
}

interface ActivitiesResponse {
  data: Activity[]
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'w-badge-amber',
  completed: 'w-badge-green',
  skipped:   'w-badge-red',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function OverviewTab({ farm, farmId }: { farm: Farm; farmId: string }) {
  const { data, isLoading } = useQuery<ActivitiesResponse>({
    queryKey: ['farm', farmId, 'activities', 'recent'],
    queryFn: async () => {
      const res = await fetch(
        `/api/farm/farms/${farmId}/activities?page_size=5&sort_by=scheduledDate&order=desc`,
      )
      if (!res.ok) throw new Error('Failed to load activities')
      return res.json() as Promise<ActivitiesResponse>
    },
  })

  const activities = data?.data ?? []
  const lat = Number(farm.locationLat).toFixed(4)
  const lng = Number(farm.locationLng).toFixed(4)
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`

  return (
    <div className="space-y-4">
      {/* Map placeholder */}
      <div>
        <p className="text-[9px] font-bold text-[#1A6B3C] uppercase tracking-[0.8px] mb-2">
          Farm Location
        </p>
        <div
          className="rounded-[8px] bg-[#EAF4EE] border border-[#1A6B3C] flex flex-col items-center justify-center py-6 gap-2"
        >
          <p className="text-[12px] font-semibold text-[#0D4A28]">
            {lat}, {lng}
          </p>
          <p className="text-[10px] text-[#6B7280]">
            {farm.county}{farm.subCounty ? `, ${farm.subCounty}` : ''}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-btn-sm flex items-center gap-1 mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open in Google Maps
          </a>
        </div>
      </div>

      {/* Weather placeholder */}
      <div>
        <p className="text-[9px] font-bold text-[#1A6B3C] uppercase tracking-[0.8px] mb-2">
          Weather, {farm.county}
        </p>
        <div
          className="rounded-[8px] px-[10px] py-[8px] text-[9px] text-[#374151]"
          style={{
            background: 'linear-gradient(135deg, #0369A1, #0E7490)',
            color: '#fff',
          }}
        >
          <p className="font-semibold text-[11px] mb-0.5">🌤 Weather data</p>
          <p className="text-white/80 text-[9px]">
            Live forecast for {farm.county} county loads from the weather service.
          </p>
        </div>
      </div>

      {/* Recent activities */}
      <div>
        <p className="text-[9px] font-bold text-[#1A6B3C] uppercase tracking-[0.8px] mb-2">
          Recent Activities
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#1A6B3C]" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-[9px] text-[#9CA3AF] py-4 text-center">
            No activities scheduled yet.
          </p>
        ) : (
          <table className="w-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Activity</th>
                <th>Date</th>
                <th>Status</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((act) => (
                <tr key={act.id}>
                  <td className="capitalize">{act.type}</td>
                  <td>{act.title}</td>
                  <td>{fmtDate(act.scheduledDate)}</td>
                  <td>
                    <span className={STATUS_BADGE[act.status] ?? 'w-badge-blue'}>
                      {act.status}
                    </span>
                  </td>
                  <td>{act.assignedWorker?.fullName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
