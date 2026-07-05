'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  KpiCard,
  DataTable,
  StatusBadge,
  Avatar,
  Field,
  FieldGroup,
  FormSection,
  TextInput,
  Textarea,
  ChipSelect,
  AlertBox,
} from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface SubsidyApplicationRow extends Record<string, unknown> {
  id: string
  farmerId: string
  farmId: string
  status: string
  notes: string | null
  submittedAt: string
  county: string | null
  certNumber: string | null
  program: { id: string; name: string } | null
}

interface ApplicationsResponse {
  data: SubsidyApplicationRow[]
  meta: { total: number; page: number; page_size: number }
}

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'red'; label: string }> = {
  submitted: { variant: 'amber', label: 'Pending' },
  under_review: { variant: 'amber', label: 'Pending' },
  approved: { variant: 'green', label: 'Approved' },
  rejected: { variant: 'red', label: 'Rejected' },
}

export function ApplicationsReviewQueue() {
  const queryClient = useQueryClient()
  const [countyFilter, setCountyFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [approvedItems, setApprovedItems] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [collectionPoint, setCollectionPoint] = useState('')
  const [transportProvided, setTransportProvided] = useState<string>('no')
  const [officerNotes, setOfficerNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['govt', 'subsidies', 'applications', 'queue', countyFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'submitted', page_size: '20' })
      if (countyFilter) params.set('county', countyFilter)
      const res = await fetch(`/api/govt/subsidies/applications?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load applications')
      return res.json() as Promise<ApplicationsResponse>
    },
  })

  const applications = data?.data ?? []
  const selected = applications.find((a) => a.id === selectedId) ?? applications[0]

  const statusMutation = useMutation({
    mutationFn: async (payload: { status: 'approved' | 'rejected' }) => {
      if (!selected) throw new Error('No application selected')
      const res = await fetch(`/api/govt/subsidies/applications/${selected.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: payload.status,
          ...(payload.status === 'approved'
            ? {
                approved_items: approvedItems || undefined,
                delivery_date: deliveryDate || undefined,
                collection_point: collectionPoint || undefined,
                transport_provided: transportProvided === 'yes',
                officer_notes: officerNotes || undefined,
              }
            : { officer_notes: officerNotes || undefined }),
        }),
      })
      if (!res.ok) throw new Error('Failed to update application')
      return res.json() as Promise<{ data: SubsidyApplicationRow }>
    },
    onSuccess: (body, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['govt', 'subsidies', 'applications'] })
      setSelectedId(null)
      if (vars.status === 'approved') {
        toast.success(`Approved. Cert number: ${body.data.certNumber ?? '—'}`)
      } else {
        toast.success('Application rejected')
      }
    },
    onError: () => toast.error('Failed to update application status'),
  })

  const columns: DataTableColumn<SubsidyApplicationRow>[] = [
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
    { key: 'county', header: 'County', render: (row) => row.county ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const b = STATUS_BADGE[row.status] ?? STATUS_BADGE.submitted
        return <StatusBadge variant={b.variant}>{b.label}</StatusBadge>
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedId(row.id)}
          className="rounded-md bg-ac-green px-2.5 py-1 text-sm font-semibold text-white"
        >
          Review →
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Subsidy Applications</p>
        <p className="mt-0.5 text-sm text-muted">Review queue — all programs</p>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <KpiCard variant="amber" value={data?.meta.total ?? 0} label="Pending Review" />
        {/* TODO(real-data): approved/rejected-this-month and avg processing time need an
            analytics aggregate the govt-service API doesn't expose yet — no live source. */}
        <KpiCard variant="green" value="—" label="Approved (Month)" />
        <KpiCard variant="red" value="—" label="Rejected" />
        <KpiCard variant="teal" value="—" label="Avg Processing Time" />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <TextInput
          placeholder="Filter by county…"
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-base border border-border bg-white px-4 py-3">
          <p className="mb-2 text-md font-semibold text-ink">Pending Applications</p>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted">Loading…</p>
          ) : applications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No pending applications</p>
          ) : (
            <DataTable columns={columns} data={applications} onRowClick={(row) => setSelectedId(row.id)} />
          )}
        </div>

        <div className="rounded-base border border-border bg-white px-4 py-3">
          {!selected ? (
            <p className="py-6 text-center text-sm text-muted">Select an application to review</p>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar initials={selected.farmerId.slice(0, 2).toUpperCase()} />
                <div className="flex-1">
                  <p className="text-md font-bold text-ink">Application Review</p>
                  <p className="text-xs text-muted">
                    {selected.program?.name ?? 'Program'} · Farmer {selected.farmerId.slice(0, 8)}…
                  </p>
                </div>
                <StatusBadge variant={STATUS_BADGE[selected.status]?.variant ?? 'amber'}>
                  {STATUS_BADGE[selected.status]?.label ?? 'Pending'}
                </StatusBadge>
              </div>

              <FormSection title="Approval Details">
                <FieldGroup cols={2}>
                  <Field label="Approved Items">
                    <TextInput
                      value={approvedItems}
                      onChange={(e) => setApprovedItems(e.target.value)}
                      placeholder="e.g. 50kg CAN Fertiliser"
                    />
                  </Field>
                  <Field label="Delivery Date">
                    <TextInput
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <FieldGroup cols={2}>
                  <Field label="Collection Point">
                    <TextInput
                      value={collectionPoint}
                      onChange={(e) => setCollectionPoint(e.target.value)}
                      placeholder="e.g. Nakuru NCPB Depot"
                    />
                  </Field>
                  <Field label="Transport Provided?">
                    <ChipSelect
                      options={[
                        { value: 'no', label: 'No — farmer collects' },
                        { value: 'yes', label: 'Yes — delivery arranged' },
                      ]}
                      value={transportProvided}
                      onChange={setTransportProvided}
                    />
                  </Field>
                </FieldGroup>
                <Field label="Officer Notes">
                  <Textarea
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    placeholder="Internal notes…"
                  />
                </Field>
              </FormSection>

              <AlertBox variant="green">
                Farmer will receive an SMS confirmation immediately on approval. Certificate
                format: KE/{'{'}County{'}'}/{'{'}Year{'}'}/{'{'}Sequence{'}'}.
              </AlertBox>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ status: 'approved' })}
                  className="flex-1 rounded-md bg-ac-green px-3 py-2.5 text-center text-base font-semibold text-white disabled:opacity-50"
                >
                  ✅ Approve & Notify Farmer
                </button>
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ status: 'rejected' })}
                  className="rounded-md bg-ac-red px-3.5 py-2.5 text-base font-semibold text-white disabled:opacity-50"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
