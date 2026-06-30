'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { WebDataTable } from '@/components/ui/WebDataTable'

interface CreditScoreResponse {
  data: {
    score: number
    band: 'A' | 'B' | 'C' | 'D'
    max_loan_kes: number
    computed_at: string
  }
}

interface Loan {
  id: string
  lender_name: string
  amount_kes: number
  interest_rate: number
  term_months: number
  paid_kes: number
  remaining_kes: number
  next_due_date: string | null
  status: string
}

interface LoansResponse {
  data: Loan[]
}

const BAND_CLASS: Record<string, string> = {
  A: 'w-badge-green',
  B: 'w-badge-blue',
  C: 'w-badge-amber',
  D: 'w-badge-red',
}

const LOAN_COLS = [
  { key: 'lender',     header: 'Lender',        width: '20%' },
  { key: 'amount',     header: 'Amount',         width: '15%' },
  { key: 'rate',       header: 'Rate',           width: '10%' },
  { key: 'paid',       header: 'Paid',           width: '15%' },
  { key: 'remaining',  header: 'Remaining',      width: '15%' },
  { key: 'next_due',   header: 'Next Due',       width: '15%' },
  { key: 'status',     header: 'Status',         width: '10%' },
]

function formatKES(n: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n)
}

interface FarmerFinanceTabProps {
  farmerId: string
}

export function FarmerFinanceTab({ farmerId }: FarmerFinanceTabProps) {
  const scoreQuery = useQuery({
    queryKey: ['admin', 'credit-score', farmerId],
    queryFn: async () => {
      const res = await api.get<CreditScoreResponse>(
        `/api/v1/finance/credit-score?user_id=${farmerId}`,
      )
      return res.data.data
    },
  })

  const loansQuery = useQuery({
    queryKey: ['admin', 'loans', farmerId],
    queryFn: async () => {
      const res = await api.get<LoansResponse>(
        `/api/v1/finance/loans?user_id=${farmerId}`,
      )
      return res.data.data
    },
  })

  const score = scoreQuery.data
  const loans = loansQuery.data ?? []

  return (
    <div className="space-y-6">
      {/* Credit score panel */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.05em] text-[#1A6B3C]">
          Credit Score
        </p>
        {scoreQuery.isLoading ? (
          <div className="h-12 animate-pulse rounded bg-[#F3F4F6]" />
        ) : score ? (
          <div className="flex items-center gap-5">
            <div>
              <span className="text-[32px] font-extrabold text-[#1A6B3C]">{score.score}</span>
              <span className="ml-2 text-[9px] text-[#6B7280]">/ 100</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={BAND_CLASS[score.band] ?? 'w-badge-blue'}>Band {score.band}</span>
                <span className="text-[9px] text-[#6B7280]">
                  Max loan: {formatKES(score.max_loan_kes)}
                </span>
              </div>
              <div className="w-48">
                <div className="w-score-bar">
                  <div className="w-score-fill" style={{ width: `${score.score}%` }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[9px] text-[#6B7280]">No credit score available</p>
        )}
      </div>

      {/* Loans table */}
      <div>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.05em] text-[#1A6B3C]">
          Loans
        </p>
        {loansQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-[#F3F4F6]" />
            ))}
          </div>
        ) : loans.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[9px] text-[#6B7280]">
            No active loans
          </div>
        ) : (
          <WebDataTable
            columns={LOAN_COLS}
            data={loans.map((l) => ({
              lender: l.lender_name,
              amount: formatKES(l.amount_kes),
              rate: `${l.interest_rate}% p.a.`,
              paid: formatKES(l.paid_kes),
              remaining: formatKES(l.remaining_kes),
              next_due: l.next_due_date
                ? new Date(l.next_due_date).toLocaleDateString('en-KE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—',
              status: (
                <span className={l.status === 'active' ? 'w-badge-green' : 'w-badge-amber'}>
                  {l.status}
                </span>
              ),
            }))}
          />
        )}
      </div>
    </div>
  )
}
