'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { KpiCard, DataTable, StatusBadge } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface FarmRow extends Record<string, unknown> {
  id: string
  name: string
  farmer_name: string
  county: string
  area_acres: number
  plots_count: number
  workers_count: number
  health_score: number
  registered_at: string
}

function healthVariant(score: number): 'green' | 'amber' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'amber'
  return 'red'
}

export default function FarmRegistryPage() {
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'farms', search, county],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (county) params.set('county', county)
      params.set('page_size', '50')
      const res = await api.get<{ data: FarmRow[]; meta: { total: number } }>(
        `/api/v1/admin/farms?${params.toString()}`,
      )
      return res.data
    },
  })

  const farms = data?.data ?? []
  const belowHealth = farms.filter((f) => f.health_score < 50).length

  const columns: DataTableColumn<FarmRow>[] = [
    { key: 'name', header: 'Farm' },
    { key: 'farmer_name', header: 'Farmer' },
    { key: 'county', header: 'County' },
    { key: 'area_acres', header: 'Size', render: (f) => `${f.area_acres} acres` },
    { key: 'plots_count', header: 'Plots' },
    { key: 'workers_count', header: 'Workers' },
    {
      key: 'health_score',
      header: 'Health',
      render: (f) => <StatusBadge variant={healthVariant(f.health_score)}>{f.health_score}%</StatusBadge>,
    },
    { key: 'registered_at', header: 'Registered', render: (f) => new Date(f.registered_at).toLocaleDateString() },
    {
      key: 'action',
      header: 'Action',
      render: (f) => (
        <Link
          href={`/admin/users`}
          className={`rounded-md px-2.5 py-1 text-sm font-semibold text-white ${
            f.health_score < 50 ? 'bg-ac-red' : 'bg-ac-green'
          }`}
        >
          {f.health_score < 50 ? 'Urgent' : 'View'}
        </Link>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Farm Registry</p>
        <p className="mt-0.5 text-sm text-muted">{data?.meta.total ?? 0} farms</p>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <KpiCard variant="green" value={data?.meta.total ?? 0} label="Total Farms" />
        <KpiCard variant="teal" value={farms.reduce((s, f) => s + f.plots_count, 0)} label="Total Plots (page)" />
        <KpiCard variant="blue" value={farms.reduce((s, f) => s + f.workers_count, 0)} label="Total Workers (page)" />
        <KpiCard variant="red" value={belowHealth} label="Health < 50% — Need Attention" />
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search farms…"
          className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base"
        />
        <input
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          placeholder="Filter by county…"
          className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base"
        />
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : farms.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No farms found</p>
        ) : (
          <DataTable columns={columns} data={farms} />
        )}
      </div>
    </div>
  )
}
