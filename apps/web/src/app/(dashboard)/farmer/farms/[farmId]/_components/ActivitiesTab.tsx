'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Loader2, CalendarDays, CheckCircle2, Clock, X } from 'lucide-react'

type ActivityType = 'planting' | 'irrigation' | 'fertilising' | 'pesticide' | 'harvesting' | 'weeding' | 'other'
type ActivityStatus = 'pending' | 'completed' | 'skipped'

interface Activity {
  id: string
  farmId: string
  type: ActivityType
  title: string
  description: string | null
  scheduledDate: string
  completedDate: string | null
  status: ActivityStatus
  labourCostKes: string
  notes: string | null
  createdAt: string
}

interface ActivitiesResponse {
  data: Activity[]
  meta: { total: number }
}

const ACTIVITY_TYPES: ActivityType[] = [
  'planting', 'irrigation', 'fertilising', 'pesticide', 'harvesting', 'weeding', 'other',
]

const STATUS_STYLE: Record<ActivityStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-gray-100 text-gray-500',
}

const TYPE_COLOR: Record<ActivityType, string> = {
  planting: 'bg-emerald-100 text-emerald-700',
  irrigation: 'bg-blue-100 text-blue-700',
  fertilising: 'bg-lime-100 text-lime-700',
  pesticide: 'bg-orange-100 text-orange-700',
  harvesting: 'bg-yellow-100 text-yellow-700',
  weeding: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Schedule Activity Modal ──────────────────────────────────────────────────

function ScheduleModal({
  farmId,
  onClose,
  onSaved,
}: {
  farmId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    type: 'planting' as ActivityType,
    title: '',
    description: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    labourCostKes: '0',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function field(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Required'
    if (!form.scheduledDate) errs.scheduledDate = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/farm/farms/${farmId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          description: form.description || undefined,
          scheduledDate: form.scheduledDate,
          labourCostKes: Number(form.labourCostKes) || 0,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Failed to schedule activity')
      }
      toast.success('Activity scheduled')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule activity')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700'
  const errCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Schedule Activity</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className={labelCls}>Activity Type</label>
            <select className={inputCls} value={form.type} onChange={(e) => field('type', e.target.value)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => field('title', e.target.value)} placeholder="e.g. Plant maize in plot A" />
            {errors.title && <p className={errCls}>{errors.title}</p>}
          </div>
          <div>
            <label className={labelCls}>Description (optional)</label>
            <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => field('description', e.target.value)} placeholder="Additional details…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Scheduled Date</label>
              <input className={inputCls} type="date" value={form.scheduledDate} onChange={(e) => field('scheduledDate', e.target.value)} />
              {errors.scheduledDate && <p className={errCls}>{errors.scheduledDate}</p>}
            </div>
            <div>
              <label className={labelCls}>Labour Cost (KES)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={form.labourCostKes} onChange={(e) => field('labourCostKes', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => field('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Activities Tab ───────────────────────────────────────────────────────────

export function ActivitiesTab({ farmId }: { farmId: string }) {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<ActivitiesResponse>({
    queryKey: ['farmer', 'activities', farmId],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}/activities?page_size=50`)
      if (!res.ok) throw new Error('Failed to load activities')
      return res.json()
    },
  })

  const markDoneMutation = useMutation({
    mutationFn: (activityId: string) =>
      fetch(`/api/farm/farms/${farmId}/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', completedDate: new Date().toISOString().slice(0, 10) }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['farmer', 'activities', farmId] })
      toast.success('Activity marked as completed')
    },
    onError: () => toast.error('Failed to update activity'),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['farmer', 'activities', farmId] })

  const activities = data?.data ?? []

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">
          {data ? `${data.meta.total} activit${data.meta.total !== 1 ? 'ies' : 'y'}` : ''}
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Schedule Activity
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No activities scheduled yet</p>
          <p className="mt-1 text-xs text-gray-400">Schedule planting, irrigation, and other farm activities here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className={`flex-shrink-0 rounded-lg px-2 py-1 text-xs font-semibold capitalize ${TYPE_COLOR[act.type]}`}>
                {act.type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{act.title}</p>
                {act.description && <p className="mt-0.5 text-xs text-gray-500">{act.description}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {fmtDate(act.scheduledDate)}
                  </span>
                  {Number(act.labourCostKes) > 0 && (
                    <span>Labour: KES {Number(act.labourCostKes).toLocaleString()}</span>
                  )}
                  {act.completedDate && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Done {fmtDate(act.completedDate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[act.status]}`}>
                  {act.status}
                </span>
                {act.status === 'pending' && (
                  <button
                    onClick={() => markDoneMutation.mutate(act.id)}
                    disabled={markDoneMutation.isPending}
                    className="flex items-center gap-1 rounded-md border border-green-300 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    <Clock className="h-3 w-3" />
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ScheduleModal farmId={farmId} onClose={() => setShowModal(false)} onSaved={invalidate} />
      )}
    </div>
  )
}
