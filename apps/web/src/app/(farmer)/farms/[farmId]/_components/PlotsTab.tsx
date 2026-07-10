'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

interface CurrentCrop {
  cropType: string
  variety: string | null
  plantingDate: string
  areaAcres: string
}

interface Plot {
  id: string
  name: string
  areaAcres: string
  currentCrop?: CurrentCrop | null
}

interface PlotsResponse {
  data: Plot[]
}

interface AddCropResponse {
  data?: { activitiesGenerated?: number; scheduleItemsCreated?: number }
  activitiesGenerated?: number
}

const CROP_TYPES = [
  'Maize', 'Beans', 'Cabbage', 'Tomato', 'Potato', 'Wheat', 'Other',
]

const inputCls =
  'w-full border border-[#E5E7EB] rounded-[5px] py-[7px] px-[9px] text-md text-[#111827] bg-[#F9FAFB] focus:outline-none focus:border-[#1A6B3C]'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── AddCropModal ──────────────────────────────────────────────────────────────

function AddCropModal({
  farmId,
  plots,
  preselectedPlotId,
  onClose,
  onSaved,
}: {
  farmId: string
  plots: Plot[]
  preselectedPlotId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [plotId,       setPlotId]       = useState(preselectedPlotId ?? '')
  const [cropType,     setCropType]     = useState('')
  const [variety,      setVariety]      = useState('')
  const [plantingDate, setPlantingDate] = useState('')
  const [area,         setArea]         = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  const selectedPlot = plots.find((p) => p.id === plotId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plotId || !cropType || !plantingDate) return

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/farm/farms/${farmId}/plots/${plotId}/crop`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cropType,
            variety:      variety || undefined,
            plantingDate,
            areaAcres:    parseFloat(area) || undefined,
          }),
        },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Failed to save crop')
      }
      const body = (await res.json()) as AddCropResponse
      const n =
        body.data?.activitiesGenerated ??
        body.data?.scheduleItemsCreated ??
        body.activitiesGenerated
      if (n != null) {
        toast.success(`Crop saved! AI generated ${n} activity schedule items.`)
      } else {
        toast.success('Crop saved!')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save crop')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[8px] bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-[#111827]">Add Crop to Plot</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="mb-1 block text-md font-semibold text-[#374151]">
              Plot<span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <select
              className={inputCls}
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              required
            >
              <option value="">Select plot</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.areaAcres} ac)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-md font-semibold text-[#374151]">
              Crop Type<span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <select
              className={inputCls}
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              required
            >
              <option value="">Select crop</option>
              {CROP_TYPES.map((c) => (
                <option key={c} value={c.toLowerCase()}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-md font-semibold text-[#374151]">
              Variety
            </label>
            <input
              className={inputCls}
              placeholder="e.g. H614D"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-md font-semibold text-[#374151]">
                Planting Date<span className="text-[#DC2626] ml-0.5">*</span>
              </label>
              <input
                className={inputCls}
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-md font-semibold text-[#374151]">
                Area (acres)
              </label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                max={selectedPlot ? parseFloat(selectedPlot.areaAcres) : undefined}
                placeholder="0.0"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-[#E5E7EB] rounded-[5px] px-3 py-[6px] text-md text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !plotId || !cropType || !plantingDate}
              className="w-btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {submitting ? 'Saving…' : 'Save Crop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── AddPlotModal ──────────────────────────────────────────────────────────────

function AddPlotModal({
  farmId,
  farmAcres,
  onClose,
  onSaved,
}: {
  farmId: string
  farmAcres: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name,       setName]       = useState('')
  const [area,       setArea]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/farm/farms/${farmId}/plots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          areaAcres: parseFloat(area) || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Failed to add plot')
      }
      toast.success(`Plot "${name.trim()}" added`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add plot')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-[8px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3">
          <h2 className="text-lg font-bold text-[#111827]">Add Plot</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="mb-1 block text-md font-semibold text-[#374151]">
              Plot Name<span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <input
              className={inputCls}
              placeholder="e.g. Plot A, North Field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-md font-semibold text-[#374151]">
              Size (acres)
            </label>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0"
              max={farmAcres}
              placeholder="0.0"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-[#E5E7EB] rounded-[5px] px-3 py-[6px] text-md text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {submitting ? 'Adding…' : 'Add Plot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PlotsTab ──────────────────────────────────────────────────────────────────

export function PlotsTab({
  farmId,
  farmAcres,
}: {
  farmId: string
  farmAcres: number
}) {
  const queryClient = useQueryClient()
  const [showAddCrop, setShowAddCrop]       = useState(false)
  const [showAddPlot, setShowAddPlot]       = useState(false)
  const [selectedPlotId, setSelectedPlotId] = useState<string | undefined>()

  const { data, isLoading } = useQuery<PlotsResponse>({
    queryKey: ['farm', farmId, 'plots'],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}/plots`)
      if (!res.ok) throw new Error('Failed to load plots')
      return res.json() as Promise<PlotsResponse>
    },
  })

  const plots = data?.data ?? []
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['farm', farmId, 'plots'] })

  function openAddCrop(plotId?: string) {
    setSelectedPlotId(plotId)
    setShowAddCrop(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[#1A6B3C]" />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-[#6B7280]">{plots.length} plot{plots.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <button
            onClick={() => openAddCrop(undefined)}
            className="w-btn-sm flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Crop
          </button>
          <button
            onClick={() => setShowAddPlot(true)}
            className="w-btn flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Plot
          </button>
        </div>
      </div>

      {plots.length === 0 ? (
        <div className="rounded-[8px] border-2 border-dashed border-[#E5E7EB] py-10 text-center">
          <p className="text-md font-semibold text-[#6B7280] mb-1">No plots yet</p>
          <p className="text-sm text-[#9CA3AF]">Add your first plot to start tracking crops.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plots.map((plot) => (
            <div
              key={plot.id}
              className="border border-[#E5E7EB] rounded-[8px] p-[10px] bg-white"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-base font-bold text-[#111827]">{plot.name}</p>
                  <p className="text-sm text-[#6B7280]">{plot.areaAcres} acres</p>
                </div>
                <button
                  onClick={() => openAddCrop(plot.id)}
                  className="w-btn-sm flex items-center gap-1 shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  Add Crop
                </button>
              </div>

              {plot.currentCrop ? (
                <div
                  className="rounded-[6px] bg-[#EAF4EE] border border-[#1A6B3C] px-[8px] py-[6px]"
                >
                  <p className="text-md font-semibold text-[#0D4A28] capitalize">
                    {plot.currentCrop.cropType}
                    {plot.currentCrop.variety ? ` (${plot.currentCrop.variety})` : ''}
                  </p>
                  <p className="text-sm text-[#374151]">
                    Planted: {fmtDate(plot.currentCrop.plantingDate)}
                  </p>
                  {plot.currentCrop.areaAcres && (
                    <p className="text-sm text-[#6B7280]">
                      {plot.currentCrop.areaAcres} ac
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#9CA3AF] italic">No crop assigned</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddCrop && (
        <AddCropModal
          farmId={farmId}
          plots={plots}
          preselectedPlotId={selectedPlotId}
          onClose={() => setShowAddCrop(false)}
          onSaved={invalidate}
        />
      )}

      {showAddPlot && (
        <AddPlotModal
          farmId={farmId}
          farmAcres={farmAcres}
          onClose={() => setShowAddPlot(false)}
          onSaved={invalidate}
        />
      )}
    </>
  )
}
