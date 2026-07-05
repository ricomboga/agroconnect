'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KpiCard, DataTable, StatusBadge, Avatar, TextInput, Select } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface RegistrationRow extends Record<string, unknown> {
  id: string
  farmerId: string
  farmName: string
  county: string
  subCounty: string | null
  areaAcres: string
  landTitle: string | null
  status: string
  registrationRef: string | null
}

interface RegistrationsResponse {
  data: RegistrationRow[]
  meta: { total: number; page: number; page_size: number }
}

const STATUS_LABEL: Record<string, { variant: 'green' | 'amber' | 'red'; label: string }> = {
  pending: { variant: 'amber', label: 'Pending' },
  submitted: { variant: 'amber', label: 'Pending' },
  under_review: { variant: 'amber', label: 'Under Review' },
  approved: { variant: 'green', label: 'Certified' },
  rejected: { variant: 'red', label: 'Rejected' },
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved (Certified)' },
  { value: 'rejected', label: 'Rejected' },
]

export function RegistrationsTable() {
  const queryClient = useQueryClient()
  const [county, setCounty] = useState('')
  const [status, setStatus] = useState('submitted')

  const { data, isLoading } = useQuery({
    queryKey: ['govt', 'registrations', 'list', { county, status }],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: '20' })
      if (county) params.set('county', county)
      if (status) params.set('status', status)
      const res = await fetch(`/api/govt/registrations?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load registrations')
      return res.json() as Promise<RegistrationsResponse>
    },
  })

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['govt', 'registrations', 'count', 'total'],
    queryFn: async () => {
      const res = await fetch('/api/govt/registrations?page_size=1')
      if (!res.ok) return 0
      const body = (await res.json()) as RegistrationsResponse
      return body.meta.total
    },
  })

  const { data: certifiedCount = 0 } = useQuery({
    queryKey: ['govt', 'registrations', 'count', 'approved'],
    queryFn: async () => {
      const res = await fetch('/api/govt/registrations?status=approved&page_size=1')
      if (!res.ok) return 0
      const body = (await res.json()) as RegistrationsResponse
      return body.meta.total
    },
  })

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['govt', 'registrations', 'count', 'pending'],
    queryFn: async () => {
      const [submittedRes, underReviewRes] = await Promise.all([
        fetch('/api/govt/registrations?status=submitted&page_size=1'),
        fetch('/api/govt/registrations?status=under_review&page_size=1'),
      ])
      const submitted = submittedRes.ok ? ((await submittedRes.json()) as RegistrationsResponse).meta.total : 0
      const underReview = underReviewRes.ok ? ((await underReviewRes.json()) as RegistrationsResponse).meta.total : 0
      return submitted + underReview
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/govt/registrations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (!res.ok) throw new Error('Failed to approve registration')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['govt', 'registrations'] })
      toast.success('Registration approved')
    },
    onError: () => toast.error('Failed to approve registration'),
  })

  const registrations = data?.data ?? []

  const columns: DataTableColumn<RegistrationRow>[] = [
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
    { key: 'farmName', header: 'Farm Name' },
    { key: 'county', header: 'County' },
    { key: 'subCounty', header: 'Sub-county', render: (row) => row.subCounty ?? '—' },
    { key: 'areaAcres', header: 'Size', render: (row) => `${Number(row.areaAcres).toFixed(1)} ac` },
    {
      // No GPS field exists on the FarmRegistration model — landTitle (nullable) is used as the
      // closest real proxy for "incomplete documentation" rather than inventing a fake GPS flag.
      key: 'landTitle',
      header: 'Land Title',
      render: (row) =>
        row.landTitle ? (
          <StatusBadge variant="green">✓ {row.landTitle}</StatusBadge>
        ) : (
          <StatusBadge variant="red">Missing</StatusBadge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = STATUS_LABEL[row.status] ?? STATUS_LABEL.submitted
        return <StatusBadge variant={s.variant}>{s.label}</StatusBadge>
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) =>
        row.status === 'approved' ? (
          <span className="text-sm text-muted">—</span>
        ) : (
          <button
            type="button"
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate(row.id)}
            className="rounded-md bg-ac-green px-2.5 py-1 text-sm font-semibold text-white disabled:opacity-50"
          >
            Approve
          </button>
        ),
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Farm Registration Management</p>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <KpiCard variant="green" value={totalCount.toLocaleString()} label="Total Registered" />
        <KpiCard variant="amber" value={pendingCount.toLocaleString()} label="Pending Approval" />
        <KpiCard variant="green" value={certifiedCount.toLocaleString()} label="Certified (Official)" />
        {/* TODO(real-data): "incomplete" registrations (missing GPS/ID) aren't tracked as a
            status or field on FarmRegistration — no source to compute this count from. */}
        <KpiCard variant="red" value="—" label="Incomplete Applications" />
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-md font-semibold text-ink">Registrations</p>
          <div className="flex items-center gap-2">
            <TextInput
              placeholder="Filter by county…"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="max-w-[180px]"
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : registrations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No registrations found</p>
        ) : (
          <DataTable columns={columns} data={registrations} isFlagged={(row) => !row.landTitle} />
        )}

        <div className="mt-3 rounded-r-sm border-l-[3px] border-l-green bg-ac-green-light px-2.5 py-1.5 text-sm text-ac-green-dark">
          Certificate format: KE/{'{'}County{'}'}/{'{'}Year{'}'}/{'{'}Sequential number{'}'} · Farmer
          receives PDF via SMS link
        </div>
      </div>
    </div>
  )
}
