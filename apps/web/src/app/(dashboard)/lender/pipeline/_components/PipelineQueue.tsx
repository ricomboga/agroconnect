'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KpiCard, DataTable, StatusBadge, Avatar, Select } from '@agroconnect/web-ui'
import type { DataTableColumn, KpiCardVariant } from '@agroconnect/web-ui'

type LoanStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'cancelled' | 'repaid' | 'defaulted'
type CreditBand = 'A' | 'B' | 'C' | 'D' | 'ineligible'
type LoanType = 'agricultural_working_capital' | 'back_to_school' | 'asset_finance' | 'emergency'

interface LoanRow {
  id: string
  farmerId: string
  type: LoanType
  amountRequestedKes: string
  creditScore: string | null
  creditBand: CreditBand | null
  status: LoanStatus
  submittedAt: string | null
}

interface Institution {
  id: string
  name: string
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
}

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  agricultural_working_capital: 'Working Capital',
  back_to_school: 'Back to School',
  asset_finance: 'Asset Finance',
  emergency: 'Emergency',
}

const STATUS_BADGE: Record<string, { variant: 'green' | 'amber' | 'red' | 'blue'; label: string }> = {
  draft: { variant: 'blue', label: 'Draft' },
  submitted: { variant: 'amber', label: 'New' },
  under_review: { variant: 'amber', label: 'Under Review' },
  approved: { variant: 'green', label: 'Approved' },
  rejected: { variant: 'red', label: 'Rejected' },
  disbursed: { variant: 'green', label: 'Disbursed' },
  cancelled: { variant: 'red', label: 'Cancelled' },
  repaid: { variant: 'green', label: 'Repaid' },
  defaulted: { variant: 'red', label: 'Defaulted' },
}

function formatKes(amount: string | number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(amount))
}

export function PipelineQueue() {
  const router = useRouter()
  const [bandFilter, setBandFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

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

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['lender', 'pipeline', isNgo],
    queryFn: async () => {
      const res = await fetch(isNgo ? '/api/lender/grants' : '/api/finance/lender/loans')
      if (!res.ok) throw new Error('Failed to load pipeline')
      const body = (await res.json()) as { data: { loans: LoanRow[] } }
      return body.data.loans
    },
    enabled: institution !== undefined,
  })

  const filtered = useMemo(
    () =>
      loans.filter(
        (l) => (!bandFilter || l.creditBand === bandFilter) && (!typeFilter || l.type === typeFilter),
      ),
    [loans, bandFilter, typeFilter],
  )

  const counts = useMemo(() => {
    const c = { submitted: 0, under_review: 0, approved: 0, disbursed: 0 }
    for (const l of loans) {
      if (l.status in c) c[l.status as keyof typeof c] += 1
    }
    return c
  }, [loans])

  const avgScore = useMemo(() => {
    const scored = loans.filter((l) => l.creditScore !== null)
    if (scored.length === 0) return null
    return (scored.reduce((s, l) => s + Number(l.creditScore), 0) / scored.length).toFixed(0)
  }, [loans])

  const kpis: { value: string | number; label: string; variant: KpiCardVariant }[] = [
    { value: counts.submitted, label: isNgo ? 'New Applications' : 'New Applications', variant: 'blue' },
    { value: counts.under_review, label: 'Under Review', variant: 'amber' },
    { value: counts.approved, label: 'Approved', variant: 'green' },
    { value: counts.disbursed, label: isNgo ? 'Disbursed (Count)' : 'Disbursed', variant: 'gold' },
    // TODO(real-data): overdue count needs portfolio-level repayment tracking not present on the
    // pipeline payload — see /lender/portfolio.
    { value: '—', label: 'Overdue', variant: 'red' },
    { value: avgScore ?? '—', label: 'Avg Credit Score', variant: 'teal' },
  ]

  const columns: DataTableColumn<LoanRow>[] = [
    {
      key: 'farmerId',
      header: 'Farmer',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.farmerId.slice(0, 2).toUpperCase()} />
          {/* TODO(real-data): loan-service has no cross-service join to the farmer's name/county
              (CLAUDE.md AD-001 forbids cross-service DB access) — shows truncated farmer id. */}
          <span className="font-semibold text-ink">{row.farmerId.slice(0, 8)}…</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: isNgo ? 'Grant Purpose' : 'Loan Type',
      render: (row) => LOAN_TYPE_LABELS[row.type] ?? row.type,
    },
    {
      key: 'amountRequestedKes',
      header: isNgo ? 'Grant Amount' : 'Amount',
      render: (row) => formatKes(row.amountRequestedKes),
    },
    {
      key: 'creditScore',
      header: 'Credit Score',
      render: (row) => (row.creditScore !== null ? Number(row.creditScore).toFixed(0) : '—'),
    },
    {
      key: 'creditBand',
      header: 'Band',
      render: (row) =>
        row.creditBand ? (
          <StatusBadge variant={row.creditBand === 'A' || row.creditBand === 'B' ? 'green' : row.creditBand === 'C' ? 'amber' : 'red'}>
            {row.creditBand}
          </StatusBadge>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const b = STATUS_BADGE[row.status] ?? STATUS_BADGE.submitted
        return <StatusBadge variant={b.variant}>{b.label}</StatusBadge>
      },
    },
    {
      key: 'submittedAt',
      header: 'Applied',
      render: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Link href={`/lender/pipeline/${row.id}`} className="text-sm font-semibold text-ac-green">
          Review →
        </Link>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">{isNgo ? 'Grant Pipeline' : 'Loan Pipeline'}</p>
        <p className="mt-0.5 text-sm text-muted">
          {isNgo ? 'Grant applications assigned to your organisation' : 'Applications assigned to your institution'}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} variant={kpi.variant} value={kpi.value} label={kpi.label} />
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <Select value={bandFilter} onChange={(e) => setBandFilter(e.target.value)} className="w-40">
          <option value="">All Bands</option>
          <option value="A">Band A</option>
          <option value="B">Band B</option>
          <option value="C">Band C</option>
          <option value="D">Band D</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-56">
          <option value="">All Types</option>
          {Object.entries(LOAN_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No applications found</p>
        ) : (
          <DataTable columns={columns} data={filtered} onRowClick={(row) => router.push(`/lender/pipeline/${row.id}`)} />
        )}
      </div>
    </div>
  )
}
