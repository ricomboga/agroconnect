'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, MapPin, Leaf, Droplets,
  CalendarDays, Wheat, FlaskConical,
} from 'lucide-react'
import { ActivitiesTab } from './_components/ActivitiesTab'
import { HarvestsTab } from './_components/HarvestsTab'
import { InputsTab } from './_components/InputsTab'

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
  updatedAt: string
}

interface FarmResponse {
  data: Farm
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  fallow: 'bg-amber-100 text-amber-800',
  sold: 'bg-gray-100 text-gray-500',
}

const TABS = [
  { id: 'activities', label: 'Activities', Icon: CalendarDays },
  { id: 'harvests',   label: 'Harvests',   Icon: Wheat },
  { id: 'inputs',     label: 'Inputs',     Icon: FlaskConical },
] as const

type TabId = typeof TABS[number]['id']

export default function FarmDetailPage() {
  const params = useParams<{ farmId: string }>()
  const farmId = params.farmId
  const [activeTab, setActiveTab] = useState<TabId>('activities')

  const { data, isLoading, isError } = useQuery<FarmResponse>({
    queryKey: ['farmer', 'farm', farmId],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}`)
      if (!res.ok) throw new Error('Failed to load farm')
      return res.json()
    },
  })

  const farm = data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-green-600" />
      </div>
    )
  }

  if (isError || !farm) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">Farm not found or failed to load.</p>
          <Link href="/farmer/farms" className="mt-3 inline-block text-sm text-red-600 underline">
            Back to farms
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Back */}
      <Link
        href="/farmer/farms"
        className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All Farms
      </Link>

      {/* Farm header */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
              <Leaf className="h-7 w-7 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{farm.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {farm.county}{farm.subCounty ? `, ${farm.subCounty}` : ''}
                </span>
                {farm.soilType && (
                  <span className="capitalize">{farm.soilType} soil</span>
                )}
                {farm.waterSource && (
                  <span className="flex items-center gap-1 capitalize">
                    <Droplets className="h-3.5 w-3.5" />
                    {farm.waterSource}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLOR[farm.status] ?? STATUS_COLOR.active}`}>
            {farm.status}
          </span>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-400">Total Area</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">{Number(farm.areaAcres).toFixed(2)} acres</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Location</p>
            <p className="mt-0.5 text-sm font-medium text-gray-700">
              {Number(farm.locationLat).toFixed(4)}, {Number(farm.locationLng).toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Registered</p>
            <p className="mt-0.5 text-sm font-medium text-gray-700">
              {new Date(farm.createdAt).toLocaleDateString('en-KE', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white shadow-sm text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'activities' && <ActivitiesTab farmId={farmId} />}
        {activeTab === 'harvests'   && <HarvestsTab   farmId={farmId} />}
        {activeTab === 'inputs'     && <InputsTab     farmId={farmId} />}
      </div>
    </div>
  )
}
