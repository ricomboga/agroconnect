'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { KpiCard, DataTable, StatusBadge, Avatar } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface KycQueueRow extends Record<string, unknown> {
  id: string
  full_name: string
  phone: string
  role: string
  county: string
  kyc_status: string
  submitted_at: string
}

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'red'; label: string }> = {
  pending: { variant: 'amber', label: 'Pending' },
  submitted: { variant: 'amber', label: 'Submitted' },
  verified: { variant: 'green', label: 'Verified' },
  rejected: { variant: 'red', label: 'Rejected' },
}

export default function KycQueuePage() {
  const [role, setRole] = useState('')
  const [county, setCounty] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kyc', 'queue', role, county],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (role) params.set('role', role)
      if (county) params.set('county', county)
      const res = await api.get<{ data: KycQueueRow[] }>(`/api/v1/admin/kyc?${params.toString()}`)
      return res.data.data
    },
  })

  const rows = data ?? []
  const pending = rows.filter((r) => r.kyc_status === 'pending' || r.kyc_status === 'submitted').length

  const columns: DataTableColumn<KycQueueRow>[] = [
    {
      key: 'full_name',
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.full_name.slice(0, 2).toUpperCase()} />
          <div>
            <p className="font-semibold text-ink">{row.full_name}</p>
            <p className="text-xs text-muted">{row.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role' },
    { key: 'county', header: 'County' },
    {
      key: 'kyc_status',
      header: 'Status',
      render: (row) => {
        const b = STATUS_BADGE[row.kyc_status] ?? STATUS_BADGE.pending
        return <StatusBadge variant={b.variant}>{b.label}</StatusBadge>
      },
    },
    {
      key: 'submitted_at',
      header: 'Submitted',
      render: (row) => new Date(row.submitted_at).toLocaleDateString(),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Link
          href={`/admin/kyc/${row.id}`}
          className="rounded-md bg-ac-green px-2.5 py-1 text-sm font-semibold text-white"
        >
          Review →
        </Link>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">KYC Verification Queue</p>
        <p className="mt-0.5 text-sm text-muted">{pending} pending · sorted oldest first</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <KpiCard variant="amber" value={pending} label="Pending Review" />
        <KpiCard variant="green" value={rows.filter((r) => r.kyc_status === 'verified').length} label="Verified" />
        <KpiCard variant="red" value={rows.filter((r) => r.kyc_status === 'rejected').length} label="Rejected" />
      </div>

      <div className="mb-3 flex gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base"
        >
          <option value="">All Roles</option>
          <option value="farmer">Farmers</option>
          <option value="supplier">Suppliers</option>
          <option value="lender">Lenders</option>
          <option value="vet_officer">Vets</option>
        </select>
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
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No pending KYC applications</p>
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
      </div>
    </div>
  )
}
