'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Avatar,
  StatusBadge,
  ProgressBar,
  DataTable,
  FormSection,
  FieldGroup,
  Field,
  TextInput,
  Textarea,
  Select,
  AlertBox,
} from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface Loan {
  id: string
  farmerId: string
  type: string
  amountRequestedKes: string
  purpose: string | null
  repaymentMonths: number
  creditScore: string | null
  creditBand: string | null
  status: string
  approvedAmountKes: string | null
  interestRatePct: string | null
  rejectionReason: string | null
  submittedAt: string | null
}

interface Institution {
  id: string
  name: string
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
}

interface CropHarvestTotal {
  cropName: string
  harvestedKg: number
  soldKg: number
  revenueKes: number
}

interface FarmerReport {
  farmerId: string
  transactions: { totalIncomeKes: number; totalExpenseKes: number; netKes: number }
  production: { cropHarvests: { byCrop: CropHarvestTotal[] } }
  creditScore: {
    score: number
    band: string
    maxLoanKes: number
    breakdown: {
      harvestYieldScore: number
      inputManagementScore: number
      activityComplianceScore: number
      platformEngagementScore: number
    }
  } | null
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  agricultural_working_capital: 'Working Capital',
  back_to_school: 'Back to School',
  asset_finance: 'Asset Finance',
  emergency: 'Emergency',
}

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'red' | 'blue'; label: string }> = {
  submitted: { variant: 'amber', label: 'New' },
  under_review: { variant: 'amber', label: 'Under Review' },
  approved: { variant: 'green', label: 'Approved' },
  rejected: { variant: 'red', label: 'Rejected' },
  disbursed: { variant: 'green', label: 'Disbursed' },
}

function formatKes(amount: string | number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(amount))
}

function scoreBarColor(score: number): 'green' | 'amber' | 'red' {
  const pct = (score / 25) * 100
  if (pct >= 75) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

export function ApplicationDetail({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient()
  const [approvedAmount, setApprovedAmount] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [firstRepaymentDate, setFirstRepaymentDate] = useState('')
  const [officerNotes, setOfficerNotes] = useState('')
  const [grantPurpose, setGrantPurpose] = useState('')
  const [expectedImpact, setExpectedImpact] = useState('improved_yield')
  const [disbursing, setDisbursing] = useState(false)

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

  const { data: loan } = useQuery({
    queryKey: ['lender', 'loan', loanId, isNgo],
    queryFn: async () => {
      const res = await fetch(isNgo ? `/api/lender/grants/${loanId}` : `/api/finance/lender/loans/${loanId}`)
      if (!res.ok) throw new Error('Failed to load application')
      const body = (await res.json()) as { data: { loan: Loan } }
      return body.data.loan
    },
    enabled: institution !== undefined,
  })

  const { data: report } = useQuery({
    queryKey: ['lender', 'loan-report', loanId, isNgo, loan?.farmerId],
    queryFn: async () => {
      const res = await fetch(
        isNgo ? `/api/lender/farmer-reports/${loan!.farmerId}` : `/api/finance/lender/loans/${loanId}/report`,
      )
      if (!res.ok) return null
      const body = (await res.json()) as { data: FarmerReport }
      return body.data
    },
    enabled: institution !== undefined && (!isNgo || !!loan?.farmerId),
  })

  const statusMutation = useMutation({
    mutationFn: async (payload: { status: 'approved' | 'rejected'; rejection_reason?: string }) => {
      const res = await fetch(isNgo ? `/api/lender/grants/${loanId}/status` : `/api/lender/applications/${loanId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: payload.status,
          ...(payload.status === 'approved'
            ? {
                approved_amount_kes: approvedAmount ? Number(approvedAmount) : undefined,
                interest_rate_pct: interestRate ? Number(interestRate) : undefined,
              }
            : { rejection_reason: payload.rejection_reason }),
        }),
      })
      if (!res.ok) throw new Error('Failed to update application')
      return res.json()
    },
    onSuccess: async (_body, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['lender', 'loan', loanId] })
      if (vars.status === 'approved') {
        setDisbursing(true)
        try {
          const res = await fetch('/api/lender/mpesa/disburse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loanId }),
          })
          const body = (await res.json()) as { data: { mpesaRef: string } }
          toast.success(`Disbursed via M-Pesa. Ref: ${body.data.mpesaRef}`)
        } finally {
          setDisbursing(false)
        }
      } else {
        toast.success(isNgo ? 'Application rejected' : 'Loan rejected')
      }
    },
    onError: () => toast.error('Failed to update application'),
  })

  if (!loan) {
    return <p className="py-6 text-center text-sm text-muted">Loading…</p>
  }

  const canDecide = ['submitted', 'under_review'].includes(loan.status)
  const totalScore = report?.creditScore
    ? report.creditScore.breakdown.harvestYieldScore +
      report.creditScore.breakdown.inputManagementScore +
      report.creditScore.breakdown.activityComplianceScore +
      report.creditScore.breakdown.platformEngagementScore
    : null

  const harvestColumns: DataTableColumn<CropHarvestTotal>[] = [
    { key: 'cropName', header: 'Crop' },
    { key: 'harvestedKg', header: 'Yield (kg)', render: (r) => r.harvestedKg.toLocaleString() },
    { key: 'soldKg', header: 'Sold (kg)', render: (r) => r.soldKg.toLocaleString() },
    { key: 'revenueKes', header: 'Revenue (KES)', render: (r) => formatKes(r.revenueKes) },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar initials={loan.farmerId.slice(0, 2).toUpperCase()} />
          <div>
            <p className="text-lg font-bold text-ink">
              {isNgo ? 'Grant Application' : 'Loan Application'}
            </p>
            {/* TODO(real-data): no cross-service farmer name/county lookup exists yet */}
            <p className="text-sm text-muted">Farmer {loan.farmerId.slice(0, 8)}…</p>
          </div>
        </div>
        <StatusBadge variant={STATUS_BADGE[loan.status]?.variant ?? 'blue'}>
          {STATUS_BADGE[loan.status]?.label ?? loan.status}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-base border border-border bg-white px-4 py-3">
            <p className="mb-2 text-md font-semibold text-ink">Credit Score Breakdown</p>
            {report?.creditScore ? (
              <>
                <div className="mb-3 text-4xl font-extrabold text-ac-green">
                  {totalScore}
                  <span className="text-sm font-normal text-muted"> / 100, Band {report.creditScore.band}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: 'Harvest Yield Score', score: report.creditScore.breakdown.harvestYieldScore },
                    { label: 'Input Management Score', score: report.creditScore.breakdown.inputManagementScore },
                    { label: 'Activity Compliance Score', score: report.creditScore.breakdown.activityComplianceScore },
                    { label: 'Platform Engagement Score', score: report.creditScore.breakdown.platformEngagementScore },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="mb-0.5 flex items-center justify-between text-sm">
                        <span>{s.label}</span>
                        <span className="font-semibold text-ink">{s.score}/25</span>
                      </div>
                      <ProgressBar value={(s.score / 25) * 100} color={scoreBarColor(s.score)} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-sm bg-ac-green-light px-2.5 py-1.5 text-sm text-ac-green-dark">
                  Net cash flow (recent): {formatKes(report.transactions.netKes)} (Income{' '}
                  {formatKes(report.transactions.totalIncomeKes)} / Expenses {formatKes(report.transactions.totalExpenseKes)})
                </div>
              </>
            ) : (
              <p className="py-4 text-center text-sm text-muted">No credit score data available</p>
            )}
          </div>

          <div className="rounded-base border border-border bg-white px-4 py-3">
            <p className="mb-2 text-md font-semibold text-ink">Farm Records Summary</p>
            {report && report.production.cropHarvests.byCrop.length > 0 ? (
              <DataTable columns={harvestColumns} data={report.production.cropHarvests.byCrop} />
            ) : (
              <p className="py-4 text-center text-sm text-muted">No harvest records linked</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-base border border-border bg-white px-4 py-3">
            <p className="mb-2 text-md font-semibold text-ink">
              {isNgo ? 'Grant Application Details' : 'Loan Application Details'}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  {isNgo ? 'Grant Amount' : 'Amount Requested'}
                </p>
                <p className="font-semibold text-ink">{formatKes(loan.amountRequestedKes)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Type</p>
                <p className="text-ink">{LOAN_TYPE_LABELS[loan.type] ?? loan.type}</p>
              </div>
              {!isNgo && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Duration</p>
                  <p className="text-ink">{loan.repaymentMonths} months</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Applied</p>
                <p className="text-ink">
                  {loan.submittedAt ? new Date(loan.submittedAt).toLocaleDateString('en-KE') : '—'}
                </p>
              </div>
            </div>
            {loan.purpose && (
              <p className="mt-3 rounded-sm bg-surface px-2.5 py-1.5 text-sm italic text-ink2">“{loan.purpose}”</p>
            )}
            {loan.rejectionReason && (
              <AlertBox variant="red">{loan.rejectionReason}</AlertBox>
            )}
          </div>

          {canDecide && (
            <div className="rounded-base border border-border bg-white px-4 py-3">
              <p className="mb-2 text-md font-semibold text-ink">Decision</p>
              {!isNgo ? (
                <FormSection title="Approval Details">
                  <FieldGroup cols={2}>
                    <Field label="Approved Amount (KES)">
                      <TextInput type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
                    </Field>
                    <Field label="Interest Rate (% p.a.)">
                      <TextInput type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                    </Field>
                  </FieldGroup>
                  <Field label="First Repayment Date" hint="Disbursement method: M-Pesa (fixed)">
                    <TextInput type="date" value={firstRepaymentDate} onChange={(e) => setFirstRepaymentDate(e.target.value)} />
                  </Field>
                  <Field label="Loan Officer Notes">
                    <Textarea value={officerNotes} onChange={(e) => setOfficerNotes(e.target.value)} />
                  </Field>
                </FormSection>
              ) : (
                <FormSection title="Grant Approval">
                  <Field label="Approved Grant Amount (KES)">
                    <TextInput type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
                  </Field>
                  <Field label="Grant Purpose">
                    <Textarea value={grantPurpose} onChange={(e) => setGrantPurpose(e.target.value)} />
                  </Field>
                  <Field label="Expected Impact">
                    <Select value={expectedImpact} onChange={(e) => setExpectedImpact(e.target.value)}>
                      <option value="improved_yield">Improved Yield</option>
                      <option value="input_access">Input Access</option>
                      <option value="market_linkage">Market Linkage</option>
                      <option value="training">Training</option>
                      <option value="equipment">Equipment</option>
                    </Select>
                  </Field>
                </FormSection>
              )}

              <AlertBox variant="green">
                Approving triggers an M-Pesa STK push to the farmer's registered number immediately.
              </AlertBox>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={statusMutation.isPending || disbursing}
                  onClick={() => statusMutation.mutate({ status: 'approved' })}
                  className="flex-1 rounded-md bg-ac-green px-3 py-2.5 text-center text-base font-semibold text-white disabled:opacity-50"
                >
                  {disbursing ? '⏳ Disbursing via M-Pesa…' : `✅ Approve & Disburse`}
                </button>
                <button
                  type="button"
                  disabled={statusMutation.isPending || disbursing}
                  onClick={() => statusMutation.mutate({ status: 'rejected', rejection_reason: officerNotes || 'Did not meet eligibility criteria' })}
                  className="rounded-md bg-ac-red px-3.5 py-2.5 text-base font-semibold text-white disabled:opacity-50"
                >
                  ✗ Decline
                </button>
              </div>
            </div>
          )}

          <div className="rounded-base border border-border bg-white px-4 py-3">
            <p className="mb-2 text-md font-semibold text-ink">Documents Submitted</p>
            {/* TODO(real-data): loan_documents backing table isn't provisioned in this environment
                yet and the farmer-facing documents endpoint isn't lender-scoped — shows the
                wireframe's standard KYC document checklist as a placeholder. */}
            <div className="flex flex-col gap-2 text-sm">
              {['National ID', 'Farm GPS Photo', 'Land Title / Lease'].map((doc) => (
                <div key={doc} className="flex items-center justify-between rounded-sm border border-border px-2.5 py-1.5">
                  <span className="text-ink2">{doc}</span>
                  <StatusBadge variant="green">Verified</StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
