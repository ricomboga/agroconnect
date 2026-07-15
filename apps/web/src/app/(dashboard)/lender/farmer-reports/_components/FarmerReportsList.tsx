'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { DataTable, StatusBadge, Avatar, Select, TextInput, KpiCard } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface FarmerReportRow {
  farmerId: string
  fullName?: string | null
  phone?: string | null
  county: string | null
  score: number | null
  band: string | null
  activitiesPerMonth: number | null
  completionPct: number | null
  overdueCount: number | null
  lastHarvest: string | null
}

interface Institution {
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
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
  const [countyFilter, setCountyFilter] = useState('')
  const [idOrPhoneFilter, setIdOrPhoneFilter] = useState('')

  const { data: institution } = useQuery({
    queryKey: ['lender', 'institution'],
    queryFn: async () => {
      const res = await fetch('/api/lender/institution')
      if (!res.ok) return null
      const body = (await res.json()) as { data: Institution }
      return body.data
    },
  })
  const isNgo = institution?.type === 'ngo_grant'

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['lender', 'farmer-reports'],
    queryFn: async () => {
      const res = await fetch('/api/lender/farmer-reports')
      if (!res.ok) throw new Error('Failed to load farmer reports')
      const body = (await res.json()) as { data: FarmerReportRow[] }
      return body.data
    },
  })

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (bandFilter && r.band !== bandFilter) return false
        if (countyFilter && !(r.county ?? '').toLowerCase().includes(countyFilter.toLowerCase())) return false
        if (idOrPhoneFilter) {
          const needle = idOrPhoneFilter.trim().toLowerCase()
          const matchesId = r.farmerId.toLowerCase().includes(needle)
          const matchesPhone = (r.phone ?? '').toLowerCase().includes(needle)
          if (!matchesId && !matchesPhone) return false
        }
        return true
      }),
    [rows, bandFilter, countyFilter, idOrPhoneFilter],
  )

  const totalFarmers = rows.length
  const avgScore = useMemo(() => {
    const scored = rows.filter((r) => r.score !== null)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length)
  }, [rows])
  const highRiskCount = useMemo(() => rows.filter((r) => r.band === 'C' || r.band === 'D').length, [rows])
  const overdueFarmersCount = useMemo(() => rows.filter((r) => (r.overdueCount ?? 0) > 0).length, [rows])

  const columns: DataTableColumn<FarmerReportRow>[] = [
    {
      key: 'farmerId',
      header: 'Farmer',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.farmerId.slice(0, 2).toUpperCase()} />
          <span className="font-semibold text-ink">{row.fullName ?? row.farmerId.slice(0, 12)}</span>
        </div>
      ),
    },
    { key: 'county', header: 'County', render: (row) => row.county ?? '—' },
    ...(isNgo
      ? []
      : [
          {
            key: 'score',
            header: 'Credit Score',
            render: (row) =>
              row.score !== null ? (
                <StatusBadge variant={scoreVariant(row.score)}>{row.score}</StatusBadge>
              ) : (
                '—'
              ),
          } as DataTableColumn<FarmerReportRow>,
          { key: 'band', header: 'Band', render: (row) => row.band ?? '—' } as DataTableColumn<FarmerReportRow>,
        ]),
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

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <KpiCard variant="blue" value={totalFarmers} label="Total Farmers" />
        {!isNgo && <KpiCard variant="green" value={avgScore ?? '—'} label="Avg Credit Score" />}
        {!isNgo && <KpiCard variant="red" value={highRiskCount} label="High Risk (Band C/D)" />}
        <KpiCard variant="amber" value={overdueFarmersCount} label="Farmers w/ Overdue Activities" />
      </div>

      <div className="mb-3 flex gap-2">
        <TextInput
          placeholder="Farmer ID or phone…"
          value={idOrPhoneFilter}
          onChange={(e) => setIdOrPhoneFilter(e.target.value)}
          className="max-w-[200px]"
        />
        <TextInput
          placeholder="Filter by county…"
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          className="max-w-[200px]"
        />
        {!isNgo && (
          <Select value={bandFilter} onChange={(e) => setBandFilter(e.target.value)} className="w-40">
            <option value="">All Bands</option>
            <option value="A">Band A</option>
            <option value="B">Band B</option>
            <option value="C">Band C</option>
            <option value="D">Band D</option>
          </Select>
        )}
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
