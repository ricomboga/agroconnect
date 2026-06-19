'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Plus, Loader2, MapPin, Leaf, ArrowRight, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Farm {
  id: string
  name: string
  county: string
  subCounty: string | null
  areaAcres: string
  soilType: string | null
  waterSource: string | null
  status: 'active' | 'fallow' | 'sold'
  locationLat: string
  locationLng: string
  createdAt: string
}

interface FarmsResponse {
  data: Farm[]
  meta: { total: number; page: number; page_size: number }
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  fallow: 'bg-amber-100 text-amber-800',
  sold: 'bg-gray-100 text-gray-500',
}

const SOIL_TYPES = ['clay', 'loam', 'sandy', 'silty', 'peaty', 'chalky']
const WATER_SOURCES = ['rain', 'irrigation', 'borehole', 'river', 'mixed']

// ─── Create Farm Modal ────────────────────────────────────────────────────────

interface CreateFarmModalProps {
  onClose: () => void
  onCreated: () => void
}

function CreateFarmModal({ onClose, onCreated }: CreateFarmModalProps) {
  const [form, setForm] = useState({
    name: '',
    county: '',
    subCounty: '',
    areaAcres: '',
    locationLat: '',
    locationLng: '',
    soilType: '',
    waterSource: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function field(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.county.trim()) errs.county = 'Required'
    if (!form.areaAcres || isNaN(Number(form.areaAcres)) || Number(form.areaAcres) <= 0)
      errs.areaAcres = 'Enter a valid acreage'
    if (!form.locationLat || isNaN(Number(form.locationLat)))
      errs.locationLat = 'Enter valid latitude'
    if (!form.locationLng || isNaN(Number(form.locationLng)))
      errs.locationLng = 'Enter valid longitude'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/farm/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          county: form.county,
          subCounty: form.subCounty || undefined,
          areaAcres: Number(form.areaAcres),
          locationLat: Number(form.locationLat),
          locationLng: Number(form.locationLng),
          soilType: form.soilType || undefined,
          waterSource: form.waterSource || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Failed to create farm')
      }
      toast.success(`Farm "${form.name}" created successfully`)
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create farm')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700'
  const errCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Add New Farm</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className={labelCls}>Farm Name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => field('name', e.target.value)}
              placeholder="e.g. Kibira Family Farm"
            />
            {errors.name && <p className={errCls}>{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>County</label>
              <input
                className={inputCls}
                value={form.county}
                onChange={(e) => field('county', e.target.value)}
                placeholder="e.g. Nakuru"
              />
              {errors.county && <p className={errCls}>{errors.county}</p>}
            </div>
            <div>
              <label className={labelCls}>Sub-County (optional)</label>
              <input
                className={inputCls}
                value={form.subCounty}
                onChange={(e) => field('subCounty', e.target.value)}
                placeholder="e.g. Njoro"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Area (acres)</label>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0.01"
              value={form.areaAcres}
              onChange={(e) => field('areaAcres', e.target.value)}
              placeholder="e.g. 5.5"
            />
            {errors.areaAcres && <p className={errCls}>{errors.areaAcres}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Latitude</label>
              <input
                className={inputCls}
                type="number"
                step="any"
                value={form.locationLat}
                onChange={(e) => field('locationLat', e.target.value)}
                placeholder="-0.3031"
              />
              {errors.locationLat && <p className={errCls}>{errors.locationLat}</p>}
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input
                className={inputCls}
                type="number"
                step="any"
                value={form.locationLng}
                onChange={(e) => field('locationLng', e.target.value)}
                placeholder="36.0800"
              />
              {errors.locationLng && <p className={errCls}>{errors.locationLng}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Soil Type (optional)</label>
              <select
                className={inputCls}
                value={form.soilType}
                onChange={(e) => field('soilType', e.target.value)}
              >
                <option value="">Select soil type</option>
                {SOIL_TYPES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Water Source (optional)</label>
              <select
                className={inputCls}
                value={form.waterSource}
                onChange={(e) => field('waterSource', e.target.value)}
              >
                <option value="">Select water source</option>
                {WATER_SOURCES.map((w) => (
                  <option key={w} value={w} className="capitalize">{w}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Creating…' : 'Create Farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Farm Card ────────────────────────────────────────────────────────────────

function FarmCard({ farm }: { farm: Farm }) {
  return (
    <Link
      href={`/farmer/farms/${farm.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
            <Leaf className="h-5 w-5 text-green-700" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-green-700">
              {farm.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              {farm.county}{farm.subCounty ? `, ${farm.subCounty}` : ''}
            </div>
          </div>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[farm.status] ?? STATUS_COLOR.active}`}
        >
          {farm.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
        <div>
          <span className="text-gray-400">Area</span>
          <p className="font-medium text-gray-700">{Number(farm.areaAcres).toFixed(2)} acres</p>
        </div>
        {farm.soilType && (
          <div>
            <span className="text-gray-400">Soil</span>
            <p className="font-medium text-gray-700 capitalize">{farm.soilType}</p>
          </div>
        )}
        {farm.waterSource && (
          <div>
            <span className="text-gray-400">Water</span>
            <p className="font-medium text-gray-700 capitalize">{farm.waterSource}</p>
          </div>
        )}
        <div>
          <span className="text-gray-400">Added</span>
          <p className="font-medium text-gray-700">
            {new Date(farm.createdAt).toLocaleDateString('en-KE', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-green-600 group-hover:text-green-700">
        Manage farm <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FarmsPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<FarmsResponse>({
    queryKey: ['farmer', 'farms', page],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms?page=${page}&page_size=9`)
      if (!res.ok) throw new Error('Failed to load farms')
      return res.json()
    },
  })

  const farms = data?.data ?? []
  const totalPages = data ? Math.ceil(data.meta.total / data.meta.page_size) || 1 : 1
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['farmer', 'farms'] })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Farms</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data ? `${data.meta.total} farm${data.meta.total !== 1 ? 's' : ''} registered` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Add Farm
        </button>
      </div>

      {/* Farms grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-green-600" />
        </div>
      ) : farms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 py-20 text-center">
          <MapPin className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-600">No farms registered yet</h3>
          <p className="mt-1 max-w-xs text-sm text-gray-400">
            Register your farm to start tracking activities, harvests, and inputs.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Register First Farm
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {farms.map((farm) => (
              <FarmCard key={farm.id} farm={farm} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateFarmModal
          onClose={() => setShowCreate(false)}
          onCreated={invalidate}
        />
      )}
    </div>
  )
}
