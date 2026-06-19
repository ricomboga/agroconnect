'use client'

import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Badge, type BadgeProps } from '@/components/ui/badge'

export type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'repaid'
  | 'defaulted'

export type CreditBand = 'A' | 'B' | 'C' | 'D' | 'ineligible'

export type LoanType =
  | 'agricultural_working_capital'
  | 'back_to_school'
  | 'asset_finance'
  | 'emergency'

export interface LoanSummary {
  id: string
  farmerId: string
  type: LoanType
  amountRequestedKes: string
  creditScore: string | null
  creditBand: CreditBand | null
  status: LoanStatus
  submittedAt: string | null
  createdAt: string
}

const STATUS_VARIANTS: Record<LoanStatus, BadgeProps['variant']> = {
  draft: 'secondary',
  submitted: 'warning',
  under_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  disbursed: 'success',
  repaid: 'secondary',
  defaulted: 'destructive',
}

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  agricultural_working_capital: 'Working Capital',
  back_to_school: 'Back to School',
  asset_finance: 'Asset Finance',
  emergency: 'Emergency',
}

function formatKes(amount: string | number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const columns: ColumnDef<LoanSummary>[] = [
  {
    accessorKey: 'farmerId',
    header: 'Farmer',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-600">
        {row.original.farmerId.slice(0, 8)}…
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Loan Type',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">{LOAN_TYPE_LABELS[row.original.type]}</span>
    ),
  },
  {
    accessorKey: 'amountRequestedKes',
    header: 'Amount Requested',
    cell: ({ row }) => (
      <span className="font-medium text-gray-900">
        {formatKes(row.original.amountRequestedKes)}
      </span>
    ),
  },
  {
    accessorKey: 'creditScore',
    header: 'Credit Score',
    cell: ({ row }) => {
      const score = row.original.creditScore
      return (
        <span className="text-sm text-gray-700">
          {score !== null ? Number(score).toFixed(1) : '—'}
        </span>
      )
    },
  },
  {
    accessorKey: 'creditBand',
    header: 'Band',
    cell: ({ row }) => {
      const band = row.original.creditBand
      if (!band) return <span className="text-gray-400">—</span>
      return (
        <Badge variant="secondary" className="font-bold">
          {band}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANTS[row.original.status]}>
        {row.original.status.replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'submittedAt',
    header: 'Submitted',
    cell: ({ row }) => (
      <span className="text-xs text-gray-500">{formatDate(row.original.submittedAt)}</span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link
        href={`/lender/applications/${row.original.id}`}
        className="text-xs font-medium text-green-600 hover:text-green-800"
      >
        Review →
      </Link>
    ),
  },
]

export function LoanPipelineTable({ loans }: { loans: LoanSummary[] }) {
  return <DataTable columns={columns} data={loans} />
}
