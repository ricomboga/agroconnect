'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { DataTable, StatusBadge, Avatar, Select } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface FarmerReportRow {
  farmerId: string
  county: string | null
  score: number | null
  band: string | null
  activitiesPerMonth: number | null
  completionPct: number | null
  overdueCount: number | null
  lastHarvest: string | null
}

function scoreVariant(score: number | null): 'green' | 'amber' | 'blue' | 'red' {
  if (score === null) return 'blue'
  if (score >= 80) return 'green'
  if (score >= 60) return 'amber'
  if (score >= 40) return 'amber'
  return 'red'
}

export function FarmerReportsList() {
  const [bandFilter, setBandFilter] = useState('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['lender', 'farmer-reports'],
    queryFn: async () => {
      const res = await fetch('/api/lender/farmer-reports')
      if (!res.ok) throw new Error('Failed to load farmer reports')
      const body = (await res.json()) as { data: FarmerReportRow[] }
      return body.data
    },
  })

  const filtered = useMemo(() => rows.filter((r) => !bandFilter || r.band === bandFilter), [rows, bandFilter])

  const columns: DataTableColumn<FarmerReportRow>[] = [
    {
      key: 'farmerId',
      header: 'Farmer',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.farmerId.slice(0, 2).toUpperCase()} />
          <span className="font-semibold text-ink">{row.farmerId.slice(0, 12)}</span>
        </div>
      ),
    },
    { key: 'county', header: 'County', render: (row) => row.county ?? '—' },
    {
      key: 'score',
      header: 'Credit Score',
      render: (row) =>
        row.score !== null ? (
          <StatusBadge variant={scoreVariant(row.score)}>{row.score}</StatusBadge>
        ) : (
          '—'
        ),
    },
    { key: 'band', header: 'Band', render: (row) => row.band ?? '—' },
    {
      key: 'activitiesPerMonth',
      header: 'Activities/Mo',
      render: (row) => {
        if (row.activitiesPerMonth === null) return '—'
        const cls = row.activitiesPerMonth >= 15 ? 'font-bold text-ac-green' : row.activitiesPerMonth >= 8 ? 'text-ac-amber' : 'text-ac-red'
        return <span className={cls}>{row.activitiesPerMonth}</span>
      },
    },
    { key: 'completionPct', header: 'Completion %', render: (row) => (row.completionPct !== null ? `${row.completionPct}%` : '—') },
    {
      key: 'overdueCount',
      header: 'Overdue',
      render: (row) =>
        row.overdueCount !== null && row.overdueCount > 0 ? (
          <StatusBadge variant="red">{row.overdueCount}</StatusBadge>
        ) : (
          row.overdueCount ?? '—'
        ),
    },
    { key: 'lastHarvest', header: 'Last Harvest', render: (row) => (row.lastHarvest ? new Date(row.lastHarvest).toLocaleDateString('en-KE') : '—') },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Link href={`/lender/farmer-reports/${row.farmerId}`} className="text-sm font-semibold text-ac-green">
          View Report →
        </Link>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Farmer Reports</p>
        <p className="mt-0.5 text-sm text-muted">Credit / impact assessment reports for farmers linked to your institution</p>
      </div>

      <div className="mb-3 flex gap-2">
        <Select value={bandFilter} onChange={(e) => setBandFilter(e.target.value)} className="w-40">
          <option value="">All Bands</option>
          <option value="A">Band A</option>
          <option value="B">Band B</option>
          <option value="C">Band C</option>
          <option value="D">Band D</option>
        </Select>
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No farmer reports found</p>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </div>
    </div>
  )
}
