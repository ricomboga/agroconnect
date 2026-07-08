'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Loader2, Wheat, X, Pencil, Trash2 } from 'lucide-react'

type QualityGrade = 'A' | 'B' | 'C' | 'reject'

interface Harvest {
  id: string
  farmId: string
  crop: string
  variety: string | null
  quantityKg: string
  qualityGrade: QualityGrade | null
  harvestDate: string
  storageLocation: string | null
  soldQuantityKg: string
  avgPriceKes: string | null
  totalRevenueKes: string | null
  notes: string | null
}

interface HarvestsResponse {
  data: Harvest[]
  meta: { total: number }
}

const GRADE_COLOR: Record<QualityGrade, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-amber-100 text-amber-800',
  reject: 'bg-red-100 text-red-700',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtKes(v: string | null) {
  if (!v) return '—'
  return `KES ${Number(v).toLocaleString()}`
}

// ─── Record Harvest Modal ─────────────────────────────────────────────────────

function RecordHarvestModal({
  farmId,
  editingHarvest,
  onClose,
  onSaved,
}: {
  farmId: string
  editingHarvest?: Harvest | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(() =>
    editingHarvest
      ? {
          crop: editingHarvest.crop,
          variety: editingHarvest.variety ?? '',
          quantityKg: String(editingHarvest.quantityKg),
          qualityGrade: (editingHarvest.qualityGrade ?? '') as QualityGrade | '',
          harvestDate: editingHarvest.harvestDate.slice(0, 10),
          storageLocation: editingHarvest.storageLocation ?? '',
          soldQuantityKg: String(editingHarvest.soldQuantityKg),
          avgPriceKes: editingHarvest.avgPriceKes ?? '',
          totalRevenueKes: editingHarvest.totalRevenueKes ?? '',
          notes: editingHarvest.notes ?? '',
        }
      : {
          crop: '',
          variety: '',
          quantityKg: '',
          qualityGrade: '' as QualityGrade | '',
          harvestDate: new Date().toISOString().slice(0, 10),
          storageLocation: '',
          soldQuantityKg: '0',
          avgPriceKes: '',
          totalRevenueKes: '',
          notes: '',
        },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function field(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.crop.trim()) errs.crop = 'Required'
    if (!form.quantityKg || isNaN(Number(form.quantityKg)) || Number(form.quantityKg) <= 0)
      errs.quantityKg = 'Enter a valid quantity'
    if (!form.harvestDate) errs.harvestDate = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const url = editingHarvest
        ? `/api/farm/farms/${farmId}/harvests/${editingHarvest.id}`
        : `/api/farm/farms/${farmId}/harvests`
      const res = await fetch(url, {
        method: editingHarvest ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: form.crop,
          variety: form.variety || undefined,
          quantityKg: Number(form.quantityKg),
          qualityGrade: form.qualityGrade || undefined,
          harvestDate: form.harvestDate,
          storageLocation: form.storageLocation || undefined,
          soldQuantityKg: Number(form.soldQuantityKg) || 0,
          avgPriceKes: form.avgPriceKes ? Number(form.avgPriceKes) : undefined,
          totalRevenueKes: form.totalRevenueKes ? Number(form.totalRevenueKes) : undefined,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? `Failed to ${editingHarvest ? 'update' : 'record'} harvest`)
      }
      toast.success(editingHarvest ? 'Harvest updated' : 'Harvest recorded')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${editingHarvest ? 'update' : 'record'} harvest`)
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
          <h2 className="text-lg font-semibold text-gray-900">{editingHarvest ? 'Edit Harvest' : 'Record Harvest'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Crop</label>
              <input className={inputCls} value={form.crop} onChange={(e) => field('crop', e.target.value)} placeholder="e.g. Maize" />
              {errors.crop && <p className={errCls}>{errors.crop}</p>}
            </div>
            <div>
              <label className={labelCls}>Variety (optional)</label>
              <input className={inputCls} value={form.variety} onChange={(e) => field('variety', e.target.value)} placeholder="e.g. DK8031" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Quantity (kg)</label>
              <input className={inputCls} type="number" step="0.01" min="0.01" value={form.quantityKg} onChange={(e) => field('quantityKg', e.target.value)} placeholder="e.g. 500" />
              {errors.quantityKg && <p className={errCls}>{errors.quantityKg}</p>}
            </div>
            <div>
              <label className={labelCls}>Quality Grade</label>
              <select className={inputCls} value={form.qualityGrade} onChange={(e) => field('qualityGrade', e.target.value)}>
                <option value="">Select grade</option>
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Below standard)</option>
                <option value="reject">Rejected</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Harvest Date</label>
              <input className={inputCls} type="date" value={form.harvestDate} onChange={(e) => field('harvestDate', e.target.value)} />
              {errors.harvestDate && <p className={errCls}>{errors.harvestDate}</p>}
            </div>
            <div>
              <label className={labelCls}>Storage Location</label>
              <input className={inputCls} value={form.storageLocation} onChange={(e) => field('storageLocation', e.target.value)} placeholder="e.g. Barn A" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Sold (kg)</label>
              <input className={inputCls} type="number" step="0.01" min="0" value={form.soldQuantityKg} onChange={(e) => field('soldQuantityKg', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Avg Price (KES/kg)</label>
              <input className={inputCls} type="number" step="0.01" min="0" value={form.avgPriceKes} onChange={(e) => field('avgPriceKes', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Total Revenue (KES)</label>
              <input className={inputCls} type="number" step="0.01" min="0" value={form.totalRevenueKes} onChange={(e) => field('totalRevenueKes', e.target.value)} placeholder="0" />
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
              {submitting ? 'Saving…' : editingHarvest ? 'Save Changes' : 'Record Harvest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Harvests Tab ─────────────────────────────────────────────────────────────

export function HarvestsTab({ farmId }: { farmId: string }) {
  const [showModal, setShowModal] = useState(false)
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<HarvestsResponse>({
    queryKey: ['farmer', 'harvests', farmId],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}/harvests?page_size=50`)
      if (!res.ok) throw new Error('Failed to load harvests')
      return res.json()
    },
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['farmer', 'harvests', farmId] })
  const harvests = data?.data ?? []

  const totalRevenue = harvests.reduce((s, h) => s + Number(h.totalRevenueKes ?? 0), 0)
  const totalKg = harvests.reduce((s, h) => s + Number(h.quantityKg), 0)

  function openEdit(harvest: Harvest) {
    setEditingHarvest(harvest)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingHarvest(null)
  }

  async function handleDelete(harvestId: string) {
    if (!window.confirm('Delete this harvest record? This cannot be undone.')) return
    setDeletingId(harvestId)
    try {
      const res = await fetch(`/api/farm/farms/${farmId}/harvests/${harvestId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Failed to delete harvest')
      }
      toast.success('Harvest deleted')
      invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete harvest')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {data && `${data.meta.total} harvest record${data.meta.total !== 1 ? 's' : ''}`}
          {totalKg > 0 && ` · ${totalKg.toLocaleString()} kg total`}
          {totalRevenue > 0 && ` · KES ${totalRevenue.toLocaleString()} revenue`}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Record Harvest
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>
      ) : harvests.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <Wheat className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No harvest records yet</p>
          <p className="mt-1 text-xs text-gray-400">Record your harvests to track yield and revenue.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-3">Crop</th>
                <th className="px-4 py-3">Harvest Date</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Sold</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Storage</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {harvests.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{h.crop}</span>
                    {h.variety && <span className="ml-1 text-xs text-gray-400">({h.variety})</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(h.harvestDate)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{Number(h.quantityKg).toLocaleString()} kg</td>
                  <td className="px-4 py-3">
                    {h.qualityGrade ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${GRADE_COLOR[h.qualityGrade]}`}>
                        {h.qualityGrade === 'reject' ? 'Rejected' : `Grade ${h.qualityGrade}`}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{Number(h.soldQuantityKg) > 0 ? `${Number(h.soldQuantityKg).toLocaleString()} kg` : '—'}</td>
                  <td className="px-4 py-3 font-medium text-green-700">{fmtKes(h.totalRevenueKes)}</td>
                  <td className="px-4 py-3 text-gray-500">{h.storageLocation ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(h)}
                        className="text-gray-400 hover:text-green-700"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(h.id)}
                        disabled={deletingId === h.id}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <RecordHarvestModal farmId={farmId} editingHarvest={editingHarvest} onClose={closeModal} onSaved={invalidate} />
      )}
    </div>
  )
}
