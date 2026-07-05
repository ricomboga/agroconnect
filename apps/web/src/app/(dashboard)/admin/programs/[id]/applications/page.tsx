'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'
import { KpiCard, StatusBadge, Avatar, FormSection, Field, FieldGroup, TextInput, AlertBox } from '@agroconnect/web-ui'

interface ApplicationRow {
  id: string
  farmerId: string
  farmId: string
  programId: string
  status: string
  county: string | null
  certNumber: string | null
  submittedAt: string
}

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'red'; label: string }> = {
  submitted: { variant: 'amber', label: 'Pending' },
  under_review: { variant: 'amber', label: 'Pending' },
  approved: { variant: 'green', label: 'Approved' },
  disbursed: { variant: 'green', label: 'Disbursed' },
  rejected: { variant: 'red', label: 'Rejected' },
}

export default function ProgramApplicationsPage() {
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [collectionPoint, setCollectionPoint] = useState('')
  const [collectionDate, setCollectionDate] = useState('')
  const [approvedItem, setApprovedItem] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'programs', params.id, 'applications'],
    queryFn: async () => {
      const res = await api.get<{ data: ApplicationRow[]; meta: { total: number } }>(
        `/api/v1/admin/programs/${params.id}/applications?status=submitted&page_size=100`,
      )
      return res.data
    },
  })

  const applications = data?.data ?? []

  const bulkApproveMutation = useMutation({
    mutationFn: () =>
      api.patch('/api/v1/admin/programs/applications/bulk', {
        ids: selectedIds,
        collectionPoint: collectionPoint || undefined,
        collectionDate: collectionDate || undefined,
        approvedItem: approvedItem || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'programs', params.id, 'applications'] })
      toast.success(`${selectedIds.length} application(s) approved`)
      setSelectedIds([])
    },
    onError: () => toast.error('Bulk approve failed'),
  })

  function toggleRow(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    setSelectedIds(selectedIds.length === applications.length ? [] : applications.map((a) => a.id))
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Program Applications</p>
        <p className="mt-0.5 text-sm text-muted">{data?.meta.total ?? 0} pending applications</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <KpiCard variant="amber" value={data?.meta.total ?? 0} label="Pending" />
        <KpiCard variant="green" value={applications.filter((a) => a.status === 'approved').length} label="Approved (page)" />
        <KpiCard variant="blue" value={selectedIds.length} label="Selected for Bulk Approve" />
      </div>

      <FormSection title="Bulk Approve Settings">
        <FieldGroup cols={3}>
          <Field label="Approved Item">
            <TextInput value={approvedItem} onChange={(e) => setApprovedItem(e.target.value)} placeholder="50kg CAN Fertiliser" />
          </Field>
          <Field label="Collection Point">
            <TextInput value={collectionPoint} onChange={(e) => setCollectionPoint(e.target.value)} placeholder="Nakuru NCPB Depot" />
          </Field>
          <Field label="Collection Date">
            <TextInput type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
          </Field>
        </FieldGroup>
        <AlertBox variant="green">
          Farmers receive an SMS confirmation immediately on approval, with a unique certificate number
          (format KE/&#123;County&#125;/&#123;Year&#125;/&#123;Sequence&#125;).
        </AlertBox>
        <button
          type="button"
          disabled={selectedIds.length === 0 || bulkApproveMutation.isPending}
          onClick={() => bulkApproveMutation.mutate()}
          className="w-fit rounded-md bg-ac-green px-3.5 py-2 text-base font-semibold text-white disabled:opacity-50"
        >
          {bulkApproveMutation.isPending
            ? 'Approving…'
            : `✅ Bulk Approve Selected (${selectedIds.length})`}
        </button>
      </FormSection>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : applications.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No pending applications</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === applications.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-2">Farmer</th>
                <th className="py-2">County</th>
                <th className="py-2">Cert Number</th>
                <th className="py-2">Status</th>
                <th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => {
                const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.submitted
                return (
                  <tr key={a.id} className="border-b border-border last:border-none">
                    <td className="py-2">
                      <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => toggleRow(a.id)} />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar initials={a.farmerId.slice(0, 2).toUpperCase()} />
                        <span className="font-semibold text-ink">{a.farmerId.slice(0, 8)}…</span>
                      </div>
                    </td>
                    <td className="py-2">{a.county ?? '—'}</td>
                    <td className="py-2">{a.certNumber ?? '—'}</td>
                    <td className="py-2">
                      <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
                    </td>
                    <td className="py-2">{new Date(a.submittedAt).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
