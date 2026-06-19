'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { MapPin, Plus, TrendingUp, Loader2, ArrowRight, Leaf } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface Farm {
  id: string
  name: string
  county: string
  areaAcres: string
  status: 'active' | 'fallow' | 'sold'
  soilType: string | null
  waterSource: string | null
  createdAt: string
}

interface FarmsResponse {
  data: Farm[]
  meta: { total: number; page: number; page_size: number }
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  fallow: 'bg-yellow-100 text-yellow-800',
  sold: 'bg-gray-100 text-gray-600',
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function FarmCard({ farm }: { farm: Farm }) {
  return (
    <Link
      href={`/farmer/farms/${farm.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
            <Leaf className="h-4 w-4 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-green-700">{farm.name}</h3>
            <p className="text-xs text-gray-500">{farm.county}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[farm.status] ?? STATUS_COLOR.active}`}>
          {farm.status}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <span><strong className="text-gray-700">{Number(farm.areaAcres).toFixed(1)}</strong> acres</span>
        {farm.soilType && <span className="capitalize">{farm.soilType} soil</span>}
        {farm.waterSource && <span className="capitalize">{farm.waterSource.replace(/_/g, ' ')}</span>}
      </div>
      <div className="mt-4 flex items-center text-xs font-medium text-green-600 group-hover:text-green-700">
        View farm <ArrowRight className="ml-1 h-3 w-3" />
      </div>
    </Link>
  )
}

export default function FarmerDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery<FarmsResponse>({
    queryKey: ['farmer', 'farms', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/farm/farms?page=1&page_size=6')
      if (!res.ok) throw new Error('Failed to load farms')
      return res.json()
    },
  })

  const farms = data?.data ?? []
  const totalFarms = data?.meta.total ?? 0
  const activeFarms = farms.filter((f) => f.status === 'active').length
  const totalAcres = farms.reduce((sum, f) => sum + Number(f.areaAcres), 0)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.fullName?.split(' ')[0] ?? user?.phone ?? 'Farmer'} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here's an overview of your farming operations.</p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Farms"
          value={totalFarms}
          sub={`${activeFarms} active`}
          icon={MapPin}
          color="bg-green-100 text-green-700"
        />
        <StatCard
          label="Total Acreage"
          value={`${totalAcres.toFixed(1)} ac`}
          sub="across all farms"
          icon={Leaf}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Season"
          value={new Date().getFullYear()}
          sub="current farming year"
          icon={TrendingUp}
          color="bg-blue-100 text-blue-700"
        />
      </div>

      {/* Recent farms */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Farms</h2>
        <Link
          href="/farmer/farms"
          className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : farms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <MapPin className="mb-3 h-10 w-10 text-gray-300" />
          <h3 className="text-base font-medium text-gray-700">No farms yet</h3>
          <p className="mt-1 text-sm text-gray-400">Add your first farm to get started tracking activities and harvests.</p>
          <Link
            href="/farmer/farms"
            className="mt-4 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add Farm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      )}
    </div>
  )
}
