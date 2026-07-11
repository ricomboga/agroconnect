'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { DataTable, StatusBadge, Avatar, TextInput, KpiCard } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'
import { NgoDownloadableReports } from './NgoDownloadableReports'

interface Institution {
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
}

interface LoanRow {
  id: string
  farmerId: string
  type: string
  amountRequestedKes: string
  approvedAmountKes: string | null
  status: string
  submittedAt: string | null
  disbursedAt: string | null
  updatedAt: string | null
}

function formatKes(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(amount))
}

function toDateOnly(value: string | null): string | null {
  return value ? value.slice(0, 10) : null
}

function DateRangeFilter({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <TextInput type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="w-36" />
      <span className="text-sm text-muted">to</span>
      <TextInput type="date" value={to} onChange={(e) => onTo(e.target.value)} className="w-36" />
    </div>
  )
}

function loanColumns(dateKey: 'disbursedAt' | 'submittedAt' | 'updatedAt', dateLabel: string): DataTableColumn<LoanRow>[] {
  return [
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
    { key: 'type', header: 'Type' },
    { key: 'amountRequestedKes', header: 'Amount Requested', render: (row) => formatKes(row.amountRequestedKes) },
    { key: 'approvedAmountKes', header: 'Approved Amount', render: (row) => formatKes(row.approvedAmountKes) },
    {
      key: dateKey,
      header: dateLabel,
      render: (row) => (row[dateKey] ? new Date(row[dateKey] as string).toLocaleDateString('en-KE') : '—'),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Link href={`/lender/pipeline/${row.id}`} className="text-sm font-semibold text-ac-green">
          View →
        </Link>
      ),
    },
  ]
}

function ReportSection({
  title,
  loans,
  status,
  dateKey,
  dateLabel,
  emptyLabel,
}: {
  title: string
  loans: LoanRow[]
  status: string
  dateKey: 'disbursedAt' | 'submittedAt' | 'updatedAt'
  dateLabel: string
  emptyLabel: string
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filtered = useMemo(
    () =>
      loans.filter((l) => {
        if (l.status !== status) return false
        const d = toDateOnly(l[dateKey])
        if (!d) return false
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      }),
    [loans, status, dateKey, from, to],
  )

  const totalKes = useMemo(
    () => filtered.reduce((sum, l) => sum + Number(l.approvedAmountKes ?? l.amountRequestedKes ?? 0), 0),
    [filtered],
  )

  return (
    <div className="rounded-base border border-border bg-white px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-md font-semibold text-ink">{title}</p>
        <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <KpiCard variant="blue" value={filtered.length} label="Count" />
        <KpiCard variant="green" value={formatKes(totalKes)} label="Total Amount" />
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <DataTable columns={loanColumns(dateKey, dateLabel)} data={filtered} />
      )}
    </div>
  )
}

export function ReportsView() {
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
    queryKey: ['lender', 'reports', 'loans'],
    queryFn: async () => {
      const res = await fetch('/api/finance/lender/loans')
      if (!res.ok) throw new Error('Failed to load report data')
      const body = (await res.json()) as { data: { loans: LoanRow[] } }
      return body.data.loans
    },
    enabled: institution !== undefined && !isNgo,
  })

  const loans = data ?? []

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">General Reports</p>
        <p className="mt-0.5 text-sm text-muted">
          Combined reporting across all farmers linked to your institution
        </p>
      </div>

      {isNgo ? (
        <NgoDownloadableReports />
      ) : (
        <>
          <div className="mb-3.5 rounded-base border border-border bg-white px-4 py-3">
            <p className="mb-1 text-md font-semibold text-ink">Farmers List Report</p>
            <p className="mb-2 text-sm text-muted">Full list of farmers linked to your institution with credit band, activity and overdue status</p>
            <Link href="/lender/farmer-reports" className="text-sm font-semibold text-ac-green">
              Open Farmers List Report →
            </Link>
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted">Loading…</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              <ReportSection
                title="Loans Disbursed"
                loans={loans}
                status="disbursed"
                dateKey="disbursedAt"
                dateLabel="Disbursed"
                emptyLabel="No disbursements in the selected date range"
              />
              <ReportSection
                title="Loans Under Review"
                loans={loans}
                status="under_review"
                dateKey="submittedAt"
                dateLabel="Submitted"
                emptyLabel="Nothing under review in the selected date range"
              />
              <ReportSection
                title="Loans Rejected"
                loans={loans}
                status="rejected"
                dateKey="updatedAt"
                dateLabel="Rejected"
                emptyLabel="Nothing rejected in the selected date range"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
