'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { KpiCard, DataTable, StatusBadge, ProgressBar, Avatar } from '@agroconnect/web-ui'
import type { DataTableColumn, KpiCardVariant } from '@agroconnect/web-ui'

interface CountySummary {
  county: string | null
  registered_farms: number
  subsidies_issued: number
  pending_registrations: number
  pending_subsidy_applications: number
  pending_license_applications: number
  total_pending_review: number
}

interface SubsidyProgramRow extends Record<string, unknown> {
  id: string
  name: string
  totalBudgetKes: string | null
  deadline: string | null
  isActive: boolean
}

interface SubsidyApplicationRow extends Record<string, unknown> {
  id: string
  farmerId: string
  status: string
  program: { name: string } | null
}

function formatKESCompact(value: string | number | null): string {
  const n = Number(value ?? 0)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function formatDeadline(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })
}

const APPLICATION_STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'red'; label: string }> = {
  submitted: { variant: 'amber', label: 'Pending' },
  under_review: { variant: 'amber', label: 'Pending' },
  approved: { variant: 'green', label: 'Approved' },
  rejected: { variant: 'red', label: 'Rejected' },
}

// Kenya has 47 counties (constitutional constant) — not fetched from any endpoint.
const COUNTIES_IN_KENYA = 47

export function DashboardContent() {
  const { data: summary } = useQuery({
    queryKey: ['govt', 'reports', 'county-summary'],
    queryFn: async () => {
      const res = await fetch('/api/govt/reports/county-summary')
      if (!res.ok) throw new Error('Failed to load county summary')
      const body = (await res.json()) as { data: CountySummary }
      return body.data
    },
  })

  const { data: programs = [] } = useQuery({
    queryKey: ['govt', 'subsidies', 'list', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/govt/subsidies?page_size=10')
      if (!res.ok) throw new Error('Failed to load programs')
      const body = (await res.json()) as { data: SubsidyProgramRow[] }
      return body.data
    },
  })

  const { data: applications = [] } = useQuery({
    queryKey: ['govt', 'subsidies', 'applications', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/govt/subsidies/applications?status=submitted&page_size=5')
      if (!res.ok) throw new Error('Failed to load applications')
      const body = (await res.json()) as { data: SubsidyApplicationRow[] }
      return body.data
    },
  })

  const programColumns: DataTableColumn<SubsidyProgramRow>[] = [
    { key: 'name', header: 'Program', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    { key: 'totalBudgetKes', header: 'Budget (KES)', render: (row) => formatKESCompact(row.totalBudgetKes) },
    // No per-program allocation/disbursement analytics endpoint exists yet — real budget/deadline
    // fields are shown; allocation & pending counts are not available from GET /govt/subsidies.
    { key: 'allocated', header: 'Allocated', render: () => <span className="text-muted">—</span> },
    { key: 'pending', header: 'Pending', render: () => <span className="text-muted">—</span> },
    { key: 'deadline', header: 'Deadline', render: (row) => formatDeadline(row.deadline) },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <StatusBadge variant={row.isActive ? 'green' : 'amber'}>
          {row.isActive ? 'Open' : 'Upcoming'}
        </StatusBadge>
      ),
    },
  ]

  const applicationColumns: DataTableColumn<SubsidyApplicationRow>[] = [
    {
      key: 'farmerId',
      header: 'Farmer',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.farmerId.slice(0, 2).toUpperCase()} />
          <span className="font-semibold text-ink">{row.farmerId.slice(0, 8)}…</span>
        </div>
      ),
    },
    { key: 'program', header: 'Program', render: (row) => row.program?.name ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const b = APPLICATION_STATUS_BADGE[row.status] ?? APPLICATION_STATUS_BADGE.submitted
        return <StatusBadge variant={b.variant}>{b.label}</StatusBadge>
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: () => (
        <Link href="/govt/applications" className="text-sm font-semibold text-ac-green">
          Review →
        </Link>
      ),
    },
  ]

  const kpis: { value: string | number; label: string; variant: KpiCardVariant }[] = [
    { value: (summary?.registered_farms ?? 0).toLocaleString(), label: 'Registered Farms', variant: 'green' },
    // TODO(real-data): needs a farm-service↔govt-service "active farmers" endpoint — no source in
    // the govt-service API contract today.
    { value: '—', label: 'Active Farmers (Platform)', variant: 'green' },
    { value: (summary?.subsidies_issued ?? 0).toLocaleString(), label: 'Subsidies Issued', variant: 'gold' },
    { value: (summary?.total_pending_review ?? 0).toLocaleString(), label: 'Pending Review', variant: 'amber' },
    // TODO(real-data): "unregistered farms" is a field-survey estimate, not derivable from any
    // govt-service or farm-service endpoint — no source to wire up.
    { value: '—', label: 'Unregistered Estimate', variant: 'red' },
    { value: COUNTIES_IN_KENYA, label: 'Counties Covered', variant: 'teal' },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">
            {summary?.county ? `${summary.county} County` : 'County'} — Agricultural Dashboard
          </p>
          <p className="mt-0.5 text-sm text-muted">Ministry of Agriculture</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} variant={kpi.variant} value={kpi.value} label={kpi.label} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-base border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">Active Programs</span>
              <Link href="/govt/programs/new" className="text-sm font-semibold text-ac-green">
                + New Program
              </Link>
            </div>
            <div className="px-4 py-3">
              <DataTable columns={programColumns} data={programs} />
            </div>
          </div>

          <div className="rounded-base border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">Recent Applications Requiring Action</span>
              <Link href="/govt/applications" className="text-sm font-semibold text-ac-green">
                View All →
              </Link>
            </div>
            <div className="px-4 py-3">
              <DataTable columns={applicationColumns} data={applications} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* TODO(real-data): needs a farm-service↔govt-service crop-type-by-county breakdown
              endpoint — not part of the govt-service API contract, so this panel is a static
              placeholder rather than a live query. */}
          <div className="rounded-base border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">
                County Crop Coverage{summary?.county ? ` — ${summary.county}` : ''}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 px-4 py-3">
              {[
                { label: '🌽 Maize', pct: 62, color: 'green' as const },
                { label: '🫘 Beans', pct: 34, color: 'amber' as const },
                { label: '🐄 Dairy Cattle', pct: 23, color: 'green' as const },
                { label: '🐔 Poultry', pct: 17, color: 'amber' as const },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-0.5 flex items-center justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="font-semibold text-ac-green">{row.pct}%</span>
                  </div>
                  <ProgressBar value={row.pct} color={row.color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
