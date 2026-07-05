'use client'

import { useQuery } from '@tanstack/react-query'
import { KpiCard, DataTable, StatusBadge, ProgressBar, Avatar, AlertBox } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface Institution {
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
}

interface LoanPortfolioRow {
  id: string
  farmerId: string
  type: string
  amountKes: number
  interestRatePct: number | null
  status: string
  progressPct: number
  nextDueDate: string | null
}

interface GrantPortfolioRow {
  id: string
  farmerId: string
  type: string
  amountKes: number
  disbursedAt: string
  status: string
}

function formatKes(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function PortfolioView() {
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

  const { data, isLoading } = useQuery({
    queryKey: ['lender', 'portfolio'],
    queryFn: async () => {
      const res = await fetch('/api/lender/portfolio')
      if (!res.ok) throw new Error('Failed to load portfolio')
      return res.json() as Promise<{
        data: {
          kpis: Record<string, number | null | undefined>
          rows: (LoanPortfolioRow | GrantPortfolioRow)[]
        }
      }>
    },
    enabled: institution !== undefined,
  })

  const rows = data?.data.rows ?? []
  const kpis = data?.data.kpis ?? {}

  const loanColumns: DataTableColumn<LoanPortfolioRow>[] = [
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
    { key: 'amountKes', header: 'Amount', render: (row) => formatKes(row.amountKes) },
    {
      key: 'progressPct',
      header: 'Repayment Progress',
      render: (row) => (
        <div className="w-28">
          <ProgressBar value={row.progressPct} color={row.progressPct >= 90 ? 'green' : row.progressPct >= 50 ? 'amber' : 'red'} />
          <span className="text-xs text-muted">{row.progressPct}%</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge variant={row.status === 'repaid' ? 'green' : 'blue'}>{row.status === 'repaid' ? 'Repaid' : 'Current'}</StatusBadge>,
    },
    { key: 'nextDueDate', header: 'Next Due', render: (row) => (row.nextDueDate ? new Date(row.nextDueDate).toLocaleDateString('en-KE') : '—') },
  ]

  const grantColumns: DataTableColumn<GrantPortfolioRow>[] = [
    {
      key: 'farmerId',
      header: 'Farmer',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.farmerId.slice(0, 2).toUpperCase()} />
          <span className="font-semibold text-ink">{row.farmerId}</span>
        </div>
      ),
    },
    { key: 'type', header: 'Grant Purpose' },
    { key: 'amountKes', header: 'Grant Amount', render: (row) => formatKes(row.amountKes) },
    { key: 'disbursedAt', header: 'Disbursed', render: (row) => new Date(row.disbursedAt).toLocaleDateString('en-KE') },
    { key: 'status', header: 'Status', render: () => <StatusBadge variant="green">Active</StatusBadge> },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">{isNgo ? 'Disbursed Grants' : 'Portfolio'}</p>
        <p className="mt-0.5 text-sm text-muted">
          {isNgo ? 'Grants disbursed by your organisation' : 'Active and repaid loans in your book'}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {isNgo ? (
          <>
            <KpiCard variant="green" value={formatKes(Number(kpis.totalDisbursedKes ?? 0))} label="Total Grants Disbursed" />
            <KpiCard variant="blue" value={kpis.activeGrants ?? 0} label="Active Grants" />
          </>
        ) : (
          <>
            <KpiCard variant="green" value={formatKes(Number(kpis.totalOutstandingKes ?? 0))} label="Total Outstanding" />
            <KpiCard variant="amber" value={kpis.nplRatioPct ?? '—'} label="NPL Ratio" />
            <KpiCard variant="red" value={kpis.overdueAmountKes ?? '—'} label="Overdue Amount" />
            <KpiCard variant="teal" value={kpis.avgRepaymentPct ?? '—'} label="Avg Repayment" />
          </>
        )}
      </div>

      {!isNgo && (
        <AlertBox variant="blue">
          NPL ratio, overdue amount and average repayment need per-payment tracking that
          finance-service doesn't record yet — shown as “—” until a Repayment model exists.
        </AlertBox>
      )}

      <div className="mt-3 rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nothing disbursed yet</p>
        ) : isNgo ? (
          <DataTable columns={grantColumns} data={rows as GrantPortfolioRow[]} />
        ) : (
          <DataTable columns={loanColumns} data={rows as LoanPortfolioRow[]} />
        )}
      </div>
    </div>
  )
}
