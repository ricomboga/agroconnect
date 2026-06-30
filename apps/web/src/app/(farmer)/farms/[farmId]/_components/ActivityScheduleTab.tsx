'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

type ActivityStatus = 'pending' | 'completed' | 'skipped'
type FilterKey = 'all' | 'overdue' | 'week' | 'upcoming' | 'done'

interface Worker {
  id: string
  userId: string
  user: { fullName: string }
}

interface Activity {
  id: string
  type: string
  title: string
  scheduledDate: string
  status: ActivityStatus
  plotName?: string | null
  cropType?: string | null
  assignedToWorkerId?: string | null
  assignedWorker?: { fullName: string } | null
}

interface ActivitiesResponse {
  data: Activity[]
  meta: { total: number }
}

interface WorkersResponse {
  data: Worker[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

const WEEK_END = new Date(TODAY)
WEEK_END.setDate(WEEK_END.getDate() + 7)

function parseDate(d: string): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function isOverdue(d: string): boolean {
  return parseDate(d) < TODAY
}

function isThisWeek(d: string): boolean {
  const dt = parseDate(d)
  return dt >= TODAY && dt <= WEEK_END
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function rowBg(act: Activity): string {
  if (act.status === 'completed') return ''
  if (isOverdue(act.scheduledDate)) return 'bg-[#FEE2E2]'
  const dt = parseDate(act.scheduledDate)
  if (
    dt.toDateString() === TODAY.toDateString()
  ) return 'bg-[#FEF3C7]'
  return ''
}

const STATUS_BADGE: Record<ActivityStatus, string> = {
  pending:   'w-badge-amber',
  completed: 'w-badge-green',
  skipped:   'w-badge-red',
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'All'       },
  { key: 'overdue',  label: 'Overdue'   },
  { key: 'week',     label: 'This Week' },
  { key: 'upcoming', label: 'Upcoming'  },
  { key: 'done',     label: 'Done'      },
]

// ── component ─────────────────────────────────────────────────────────────────

export function ActivityScheduleTab({ farmId }: { farmId: string }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterKey>('all')

  const { data, isLoading } = useQuery<ActivitiesResponse>({
    queryKey: ['farm', farmId, 'activities', 'schedule'],
    queryFn: async () => {
      const res = await fetch(
        `/api/farm/farms/${farmId}/activities?page_size=100`,
      )
      if (!res.ok) throw new Error('Failed to load activities')
      return res.json() as Promise<ActivitiesResponse>
    },
  })

  const { data: workersData } = useQuery<WorkersResponse>({
    queryKey: ['farm', farmId, 'workers'],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}/workers`)
      if (!res.ok) throw new Error('Failed to load workers')
      return res.json() as Promise<WorkersResponse>
    },
  })

  const allActivities = data?.data ?? []
  const workers = workersData?.data ?? []

  // client-side filter
  const activities = allActivities.filter((act) => {
    switch (filter) {
      case 'overdue':  return act.status === 'pending'   && isOverdue(act.scheduledDate)
      case 'week':     return act.status === 'pending'   && isThisWeek(act.scheduledDate)
      case 'upcoming': return act.status === 'pending'   && !isOverdue(act.scheduledDate) && !isThisWeek(act.scheduledDate)
      case 'done':     return act.status === 'completed'
      default:         return true
    }
  })

  const assignMutation = useMutation({
    mutationFn: ({
      activityId,
      assignedToWorkerId,
    }: {
      activityId: string
      assignedToWorkerId: string
    }) =>
      fetch(`/api/farm/farms/${farmId}/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToWorkerId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['farm', farmId, 'activities', 'schedule'],
      })
      toast.success('Worker assigned')
    },
    onError: () => toast.error('Failed to assign worker'),
  })

  const selectCls =
    'border border-[#E5E7EB] rounded-[5px] py-[4px] px-[6px] text-[9px] text-[#374151] bg-[#F9FAFB] focus:outline-none focus:border-[#1A6B3C]'

  return (
    <div>
      {/* Filter row */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="rounded-[4px] px-[10px] py-[5px] text-[9px] font-medium transition-colors cursor-pointer"
            style={{
              background: filter === key ? '#EAF4EE' : '#F3F4F6',
              color:      filter === key ? '#1A6B3C' : '#6B7280',
              fontWeight: filter === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#1A6B3C]" />
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-[8px] border-2 border-dashed border-[#E5E7EB] py-8 text-center">
          <p className="text-[10px] font-semibold text-[#6B7280] mb-1">
            No activities{filter !== 'all' ? ` in "${FILTERS.find((f) => f.key === filter)?.label}"` : ''}
          </p>
        </div>
      ) : (
        <table className="w-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Activity</th>
              <th>Plot / Crop</th>
              <th>Assigned To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((act) => {
              const overdue = act.status !== 'completed' && isOverdue(act.scheduledDate)
              const bg = rowBg(act)
              return (
                <tr
                  key={act.id}
                  className={bg}
                  style={{ opacity: act.status === 'completed' ? 0.6 : 1 }}
                >
                  <td
                    className="whitespace-nowrap"
                    style={{ color: overdue ? '#DC2626' : undefined }}
                  >
                    {fmtDate(act.scheduledDate)}
                    {overdue && (
                      <span className="ml-1 w-badge-red text-[7px] px-[4px] py-[1px]">
                        overdue
                      </span>
                    )}
                  </td>
                  <td>
                    <p className="font-medium text-[#111827]">{act.title}</p>
                    <p className="text-[8px] text-[#9CA3AF] capitalize">{act.type}</p>
                  </td>
                  <td>
                    {act.plotName && (
                      <p className="text-[9px]">{act.plotName}</p>
                    )}
                    {act.cropType && (
                      <p className="text-[8px] text-[#9CA3AF] capitalize">{act.cropType}</p>
                    )}
                    {!act.plotName && !act.cropType && <span className="text-[#9CA3AF]">—</span>}
                  </td>
                  <td>
                    {act.status !== 'completed' ? (
                      <select
                        className={selectCls}
                        value={act.assignedToWorkerId ?? ''}
                        onChange={(e) =>
                          assignMutation.mutate({
                            activityId: act.id,
                            assignedToWorkerId: e.target.value,
                          })
                        }
                        disabled={assignMutation.isPending}
                      >
                        <option value="">Unassigned</option>
                        {workers.map((w) => (
                          <option key={w.userId} value={w.userId}>
                            {w.user.fullName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[9px]">
                        {act.assignedWorker?.fullName ?? '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={STATUS_BADGE[act.status]}>{act.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
