'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { DataTable, TextInput, KpiCard, AlertBox } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'
import {
  exportFarmerListCsv,
  exportIncomeStatementCsv,
  type FarmerListRow,
  type IncomeStatementRow,
} from '../_lib/exportNgoReports'

function RosterNotConfiguredNotice() {
  return (
    <AlertBox variant="blue">
      Your organization has no operating counties configured yet, so no farmer roster can be built. Set them in{' '}
      <Link href="/lender/settings" className="font-semibold underline">
        Settings
      </Link>{' '}
      to populate this report.
    </AlertBox>
  )
}

function formatKes(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function FarmerListReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['lender', 'reports', 'farmer-list'],
    queryFn: async () => {
      const res = await fetch('/api/finance/lender/reports/farmers')
      if (!res.ok) throw new Error('Failed to load farmer list report')
      const body = (await res.json()) as { data: FarmerListRow[]; rosterConfigured: boolean }
      return body
    },
  })

  const rows = data?.data ?? []
  const rosterConfigured = data?.rosterConfigured ?? true

  const columns: DataTableColumn<FarmerListRow>[] = [
    { key: 'fullName', header: 'Name', render: (r) => r.fullName ?? r.farmerId },
    { key: 'idNumber', header: 'ID No', render: (r) => r.idNumber ?? '—' },
    { key: 'county', header: 'County', render: (r) => r.county ?? '—' },
    { key: 'subCounty', header: 'Sub-county', render: (r) => r.subCounty ?? '—' },
    { key: 'areaAcres', header: 'Acreage', render: (r) => (r.areaAcres !== null ? `${r.areaAcres} ac` : '—') },
    { key: 'farmerType', header: 'Farmer Type', render: (r) => <span className="capitalize">{r.farmerType ?? '—'}</span> },
  ]

  return (
    <div className="rounded-base border border-border bg-white px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-md font-semibold text-ink">Farmer List Report</p>
          <p className="text-sm text-muted">Name, ID number, county, sub-county, acreage and farmer type for all linked farmers</p>
        </div>
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => exportFarmerListCsv(rows)}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink2 disabled:opacity-50"
        >
          ⬇ Download CSV
        </button>
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : !rosterConfigured ? (
        <RosterNotConfiguredNotice />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No farmers linked to your institution yet</p>
      ) : (
        <DataTable columns={columns} data={rows} />
      )}
    </div>
  )
}

function IncomeStatementReport() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['lender', 'reports', 'income-statement', from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.set('from_date', from)
      if (to) params.set('to_date', to)
      const res = await fetch(`/api/finance/lender/reports/income-statement?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load income statement')
      const body = (await res.json()) as {
        data: {
          rows: IncomeStatementRow[]
          combined: { totalIncomeKes: number; totalExpenseKes: number; netIncomeKes: number }
          rosterConfigured: boolean
        }
      }
      return body.data
    },
  })

  const rows = data?.rows ?? []
  const combined = data?.combined
  const rosterConfigured = data?.rosterConfigured ?? true

  const columns: DataTableColumn<IncomeStatementRow>[] = [
    { key: 'fullName', header: 'Farmer Name', render: (r) => r.fullName ?? r.farmerId },
    { key: 'totalIncomeKes', header: 'Total Income', render: (r) => formatKes(r.totalIncomeKes) },
    { key: 'totalExpenseKes', header: 'Total Expenses', render: (r) => formatKes(r.totalExpenseKes) },
    { key: 'netIncomeKes', header: 'Net Income', render: (r) => formatKes(r.netIncomeKes) },
  ]

  return (
    <div className="rounded-base border border-border bg-white px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-md font-semibold text-ink">Combined Income Statement — All Farmers</p>
          <p className="text-sm text-muted">Total income, total expenses and net income per farmer</p>
        </div>
        <div className="flex items-center gap-2">
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <span className="text-sm text-muted">to</span>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportIncomeStatementCsv(rows)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink2 disabled:opacity-50"
          >
            ⬇ Download CSV
          </button>
        </div>
      </div>
      {combined && (
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          <KpiCard variant="green" value={formatKes(combined.totalIncomeKes)} label="Total Income" />
          <KpiCard variant="red" value={formatKes(combined.totalExpenseKes)} label="Total Expenses" />
          <KpiCard variant="blue" value={formatKes(combined.netIncomeKes)} label="Net Income" />
        </div>
      )}
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : !rosterConfigured ? (
        <RosterNotConfiguredNotice />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No transactions in the selected date range</p>
      ) : (
        <DataTable columns={columns} data={rows} />
      )}
    </div>
  )
}

export function NgoDownloadableReports() {
  return (
    <div className="flex flex-col gap-3.5">
      <FarmerListReport />
      <IncomeStatementReport />
    </div>
  )
}
