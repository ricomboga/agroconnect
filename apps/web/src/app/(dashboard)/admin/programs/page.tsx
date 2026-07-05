'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { KpiCard, DataTable, StatusBadge, ProgressBar, Select } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface ProgramRow extends Record<string, unknown> {
  id: string
  name: string
  type: string | null
  providerAgency: string
  totalBudgetKes: string | null
  maxBeneficiaries: number | null
  deadline: string | null
  status: 'draft' | 'upcoming' | 'open' | 'closed'
  pending_count: number
  approved_count: number
  rejected_count: number
  budget_allocated_pct: number | null
}

const STATUS_BADGE: Record<ProgramRow['status'], { variant: 'green' | 'amber' | 'blue' | 'red'; label: string }> = {
  open: { variant: 'green', label: 'Open' },
  upcoming: { variant: 'blue', label: 'Upcoming' },
  closed: { variant: 'red', label: 'Closed' },
  draft: { variant: 'amber', label: 'Draft' },
}

export default function ProgramsPage() {
  const [status, setStatus] = useState('')
  const [ministry, setMinistry] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'programs', status, ministry],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (ministry) params.set('ministry', ministry)
      params.set('page_size', '50')
      const res = await api.get<{
        data: ProgramRow[]
        meta: { total: number; ministries: string[] }
      }>(`/api/v1/admin/programs?${params.toString()}`)
      return res.data
    },
  })

  const programs = data?.data ?? []
  const ministries = data?.meta.ministries ?? []
  const totalPending = programs.reduce((s, p) => s + p.pending_count, 0)

  const columns: DataTableColumn<ProgramRow>[] = [
    { key: 'name', header: 'Program' },
    { key: 'providerAgency', header: 'Ministry' },
    {
      key: 'totalBudgetKes',
      header: 'Budget',
      render: (p) => (p.totalBudgetKes ? `KES ${Number(p.totalBudgetKes).toLocaleString()}` : '—'),
    },
    {
      key: 'budget_allocated_pct',
      header: 'Allocated',
      render: (p) =>
        p.budget_allocated_pct !== null ? (
          <div className="w-24">
            <ProgressBar value={p.budget_allocated_pct} color={p.budget_allocated_pct >= 80 ? 'red' : 'green'} />
            <span className="text-xs text-muted">{p.budget_allocated_pct}%</span>
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'pending_count', header: 'Pending' },
    { key: 'deadline', header: 'Deadline', render: (p) => (p.deadline ? new Date(p.deadline).toLocaleDateString() : '—') },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const b = STATUS_BADGE[p.status]
        return <StatusBadge variant={b.variant}>{b.label}</StatusBadge>
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (p) => (
        <Link
          href={`/admin/programs/${p.id}/applications`}
          className="rounded-md bg-ac-green px-2.5 py-1 text-sm font-semibold text-white"
        >
          Applications →
        </Link>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Government Programs</p>
          <p className="mt-0.5 text-sm text-muted">Admin view — all programs across all ministries</p>
        </div>
        <Link href="/govt/programs/new" className="rounded-md bg-ac-green px-3 py-1.5 text-base font-semibold text-white">
          ➕ Create Program
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <KpiCard variant="green" value={programs.filter((p) => p.status === 'open').length} label="Open Programs" />
        <KpiCard variant="amber" value={totalPending} label="Pending Applications" />
        <KpiCard variant="blue" value={data?.meta.total ?? 0} label="Total Programs" />
      </div>

      <div className="mb-3 flex gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="upcoming">Upcoming</option>
          <option value="closed">Closed</option>
          <option value="draft">Draft</option>
        </Select>
        <Select value={ministry} onChange={(e) => setMinistry(e.target.value)} className="w-56">
          <option value="">All Ministries</option>
          {ministries.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : programs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No programs found</p>
        ) : (
          <DataTable columns={columns} data={programs} />
        )}
      </div>
    </div>
  )
}
