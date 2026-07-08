'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Avatar, StatusBadge, FormSection, Field, Select, Textarea, AlertBox } from '@agroconnect/web-ui'

interface KycDocument {
  type: string
  url: string
  status: string
  uploaded_at: string
}

interface KycHistoryEntry {
  action: string
  actor: string
  note?: string
  timestamp: string
}

interface KycDetail {
  user: { id: string; full_name: string; phone: string; role: string; county: string; kyc_status: string }
  documents: KycDocument[]
  history: KycHistoryEntry[]
}

const DOC_LABELS: Record<string, string> = {
  national_id: 'National ID',
  business_cert: 'Business Certificate (BRS)',
  kvb_licence: 'KVB Licence',
  pcpb_licence: 'PCPB Licence',
  other: 'Other Document',
}

const DOC_CHECKLISTS: Record<string, string[]> = {
  national_id: ['Not expired', 'Name matches application', 'Photo is clear', 'ID number visible front + back'],
  business_cert: ['Business name matches', 'Registration number visible', 'Official stamp present', 'Not expired'],
  kvb_licence: ['Licence number visible', 'Not expired', 'Name matches', 'Specialisation listed'],
  pcpb_licence: ['Dealer name matches', 'Licence not expired', 'PCPB stamp present'],
  other: ['Document is legible', 'Matches applicant details'],
}

export default function KycDetailPage() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [decision, setDecision] = useState<'approved' | 'rejected' | 'more_info'>('approved')
  const [reason, setReason] = useState('')
  const [documentRequested, setDocumentRequested] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kyc', params.userId],
    queryFn: async () => {
      const res = await api.get<{ data: KycDetail }>(`/api/v1/admin/kyc/${params.userId}`)
      return res.data.data
    },
  })

  const decideMutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/v1/admin/kyc/${params.userId}`, {
        decision,
        reason,
        documentRequested: decision === 'more_info' ? documentRequested : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] })
      toast.success('KYC decision recorded, SMS sent to user')
      router.push('/admin/kyc')
    },
    onError: () => toast.error('Failed to record KYC decision'),
  })

  if (isLoading) return <p className="py-6 text-center text-sm text-muted">Loading…</p>
  if (!data) return <p className="py-6 text-center text-sm text-muted">Not found</p>

  const { user, documents, history } = data

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Avatar initials={user.full_name.slice(0, 2).toUpperCase()} />
        <div className="flex-1">
          <p className="text-lg font-bold text-ink">{user.full_name}</p>
          <p className="text-sm text-muted">
            {user.role} · {user.county} · {user.phone}
          </p>
        </div>
        <StatusBadge variant={user.kyc_status === 'verified' ? 'green' : user.kyc_status === 'rejected' ? 'red' : 'amber'}>
          {user.kyc_status}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {documents.length === 0 && (
            <AlertBox variant="red">No documents uploaded yet. Cannot approve without documents.</AlertBox>
          )}
          {documents.map((doc) => (
            <div key={doc.type} className="rounded-base border border-border bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-base font-bold text-ink">{DOC_LABELS[doc.type] ?? doc.type}</span>
                <StatusBadge variant={doc.status === 'approved' ? 'green' : doc.status === 'rejected' ? 'red' : 'amber'}>
                  {doc.status === 'pending' ? '✓ Uploaded' : doc.status}
                </StatusBadge>
              </div>
              <ul className="flex flex-col gap-1 text-sm text-ink2">
                {(DOC_CHECKLISTS[doc.type] ?? []).map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <input type="checkbox" className="h-3 w-3" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-base border border-border bg-white p-3">
            <p className="mb-2 text-base font-bold text-ink">KYC Status History</p>
            <div className="flex flex-col gap-2 border-l-2 border-border pl-3">
              {history.map((h, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-ink">{h.action}</p>
                  <p className="text-xs text-muted">
                    {h.actor} · {new Date(h.timestamp).toLocaleString()}
                  </p>
                  {h.note && <p className="text-xs text-ink2">{h.note}</p>}
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-muted">No history yet</p>}
            </div>
          </div>
        </div>

        <div className="rounded-base border border-ac-green bg-ac-green-light p-3">
          <FormSection title="KYC Decision">
            <AlertBox variant="green">
              Approving activates the account; rejecting or requesting more info sends the farmer/supplier an SMS.
            </AlertBox>
            <Field label="Decision">
              <Select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
                <option value="more_info">Request More Info</option>
              </Select>
            </Field>
            {decision === 'more_info' && (
              <Field label="Specific Document to Request">
                <Select value={documentRequested} onChange={(e) => setDocumentRequested(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="PCPB Licence">PCPB Licence</option>
                  <option value="Clearer ID photo">Clearer ID photo</option>
                  <option value="Updated business permit">Updated business permit</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
            )}
            <Field label="Reason / Notes" required>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Internal + SMS note…" />
            </Field>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={decideMutation.isPending || !reason.trim()}
                onClick={() => decideMutation.mutate()}
                className="flex-1 rounded-md bg-ac-green px-3 py-2 text-base font-semibold text-white disabled:opacity-50"
              >
                {decideMutation.isPending ? 'Saving…' : '✅ Submit Decision'}
              </button>
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  )
}
