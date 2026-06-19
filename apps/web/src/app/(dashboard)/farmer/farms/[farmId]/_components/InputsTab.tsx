'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Loader2, FlaskConical, X } from 'lucide-react'

type InputType = 'seed' | 'fertiliser' | 'pesticide' | 'herbicide' | 'fuel' | 'equipment' | 'other'

interface FarmInput {
  id: string
  farmId: string
  type: InputType
  productName: string
  quantity: string
  unit: string
  unitCostKes: string
  totalCostKes: string
  appliedDate: string
  notes: string | null
}

interface InputsResponse {
  data: FarmInput[]
  meta: { total: number }
}

const INPUT_TYPES: InputType[] = ['seed', 'fertiliser', 'pesticide', 'herbicide', 'fuel', 'equipment', 'other']

const TYPE_COLOR: Record<InputType, string> = {
  seed: 'bg-green-100 text-green-800',
  fertiliser: 'bg-lime-100 text-lime-800',
  pesticide: 'bg-orange-100 text-orange-800',
  herbicide: 'bg-red-100 text-red-800',
  fuel: 'bg-gray-100 text-gray-700',
  equipment: 'bg-blue-100 text-blue-800',
  other: 'bg-purple-100 text-purple-800',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Log Input Modal ──────────────────────────────────────────────────────────

function LogInputModal({
  farmId,
  onClose,
  onSaved,
}: {
  farmId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    type: 'seed' as InputType,
    productName: '',
    quantity: '',
    unit: 'kg',
    unitCostKes: '',
    totalCostKes: '',
    appliedDate: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function field(key: keyof typeof form, value: string) {
    setForm((p) => {
      const next = { ...p, [key]: value }
      if ((key === 'quantity' || key === 'unitCostKes') && next.quantity && next.unitCostKes) {
        const qty = Number(next.quantity)
        const cost = Number(next.unitCostKes)
        if (!isNaN(qty) && !isNaN(cost)) {
          next.totalCostKes = (qty * cost).toFixed(2)
        }
      }
      return next
    })
    setErrors((p) => ({ ...p, [key]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.productName.trim()) errs.productName = 'Required'
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      errs.quantity = 'Enter a valid quantity'
    if (!form.unit.trim()) errs.unit = 'Required'
    if (!form.unitCostKes || isNaN(Number(form.unitCostKes)))
      errs.unitCostKes = 'Enter a valid cost'
    if (!form.appliedDate) errs.appliedDate = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/farm/farms/${farmId}/inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          productName: form.productName,
          quantity: Number(form.quantity),
          unit: form.unit,
          unitCostKes: Number(form.unitCostKes),
          totalCostKes: Number(form.totalCostKes) || Number(form.quantity) * Number(form.unitCostKes),
          appliedDate: form.appliedDate,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Failed to log input')
      }
      toast.success('Input logged')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log input')
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
          <h2 className="text-lg font-semibold text-gray-900">Log Farm Input</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Input Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => field('type', e.target.value)}>
                {INPUT_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Product Name</label>
              <input className={inputCls} value={form.productName} onChange={(e) => field('productName', e.target.value)} placeholder="e.g. DAP Fertilizer" />
              {errors.productName && <p className={errCls}>{errors.productName}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Quantity</label>
              <input className={inputCls} type="number" step="0.001" min="0.001" value={form.quantity} onChange={(e) => field('quantity', e.target.value)} placeholder="0" />
              {errors.quantity && <p className={errCls}>{errors.quantity}</p>}
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <input className={inputCls} value={form.unit} onChange={(e) => field('unit', e.target.value)} placeholder="kg, L, bag…" />
              {errors.unit && <p className={errCls}>{errors.unit}</p>}
            </div>
            <div>
              <label className={labelCls}>Applied Date</label>
              <input className={inputCls} type="date" value={form.appliedDate} onChange={(e) => field('appliedDate', e.target.value)} />
              {errors.appliedDate && <p className={errCls}>{errors.appliedDate}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Unit Cost (KES)</label>
              <input className={inputCls} type="number" step="0.01" min="0" value={form.unitCostKes} onChange={(e) => field('unitCostKes', e.target.value)} placeholder="0" />
              {errors.unitCostKes && <p className={errCls}>{errors.unitCostKes}</p>}
            </div>
            <div>
              <label className={labelCls}>Total Cost (KES)</label>
              <input className={`${inputCls} bg-gray-50`} type="number" step="0.01" min="0" value={form.totalCostKes} onChange={(e) => field('totalCostKes', e.target.value)} placeholder="Auto-calculated" />
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
              {submitting ? 'Saving…' : 'Log Input'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Inputs Tab ───────────────────────────────────────────────────────────────

export function InputsTab({ farmId }: { farmId: string }) {
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<InputsResponse>({
    queryKey: ['farmer', 'inputs', farmId],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}/inputs?page_size=50`)
      if (!res.ok) throw new Error('Failed to load inputs')
      return res.json()
    },
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['farmer', 'inputs', farmId] })
  const inputs = data?.data ?? []

  const totalCost = inputs.reduce((s, i) => s + Number(i.totalCostKes), 0)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {data && `${data.meta.total} input record${data.meta.total !== 1 ? 's' : ''}`}
          {totalCost > 0 && ` · KES ${totalCost.toLocaleString()} total cost`}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Log Input
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>
      ) : inputs.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <FlaskConical className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No inputs logged yet</p>
          <p className="mt-1 text-xs text-gray-400">Track seeds, fertilisers, pesticides, and other inputs here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inputs.map((inp) => (
                <tr key={inp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_COLOR[inp.type]}`}>
                      {inp.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{inp.productName}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(inp.appliedDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{Number(inp.quantity).toLocaleString()} {inp.unit}</td>
                  <td className="px-4 py-3 text-gray-600">KES {Number(inp.unitCostKes).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">KES {Number(inp.totalCostKes).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={5} className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total Input Cost</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">KES {totalCost.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {showModal && (
        <LogInputModal farmId={farmId} onClose={() => setShowModal(false)} onSaved={invalidate} />
      )}
    </div>
  )
}
