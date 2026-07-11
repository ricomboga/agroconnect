'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KpiCard } from '@agroconnect/web-ui'

interface Institution {
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
}

interface MonthlyCount {
  month: string
  count: number
}

interface MonthlyIncomeExpense {
  month: string
  incomeKes: number
  expenseKes: number
}

interface LenderDashboardData {
  farmersOnboardedByMonth: MonthlyCount[]
  loansDisbursedByMonth: (MonthlyCount & { amountKes: number })[]
  loansRejectedByMonth: MonthlyCount[]
}

interface NgoDashboardData {
  farmersOnboardedByMonth: MonthlyCount[]
  incomeExpenseByMonth: MonthlyIncomeExpense[]
  inputDistributionByMonth: (MonthlyCount & { valueKes: number })[]
}

function formatKes(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function TrendChart({ title, data, color }: { title: string; data: MonthlyCount[]; color: string }) {
  const max = Math.max(...data.map((m) => m.count), 1)
  return (
    <div className="rounded-base border border-border bg-white px-4 py-3">
      <p className="mb-3 text-md font-semibold text-ink">{title}</p>
      <div className="flex h-32 items-end gap-2">
        {data.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold text-ink">{m.count}</span>
            <div className={`w-full rounded-t-[3px] ${color}`} style={{ height: `${(m.count / max) * 100}%` }} />
            <span className="text-xs text-muted">{m.month}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function IncomeExpenseChart({ data }: { data: MonthlyIncomeExpense[] }) {
  const max = Math.max(...data.map((m) => Math.max(m.incomeKes, m.expenseKes)), 1)
  return (
    <div className="rounded-base border border-border bg-white px-4 py-3">
      <p className="mb-3 text-md font-semibold text-ink">Farmer Income & Expenses / Month</p>
      <div className="flex h-32 items-end gap-3">
        {data.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-1" style={{ height: '96px' }}>
              <div className="w-1/2 rounded-t-[3px] bg-ac-green" style={{ height: `${(m.incomeKes / max) * 100}%` }} />
              <div className="w-1/2 rounded-t-[3px] bg-ac-red" style={{ height: `${(m.expenseKes / max) * 100}%` }} />
            </div>
            <span className="text-xs text-muted">{m.month}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span><span className="inline-block h-2 w-2 rounded-sm bg-ac-green" /> Income</span>
        <span><span className="inline-block h-2 w-2 rounded-sm bg-ac-red" /> Expenses</span>
      </div>
    </div>
  )
}

export function DashboardView() {
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

  const { data: dashboard } = useQuery({
    queryKey: ['lender', 'dashboard', isNgo],
    queryFn: async () => {
      const res = await fetch('/api/finance/lender/dashboard')
      if (!res.ok) throw new Error('Failed to load dashboard')
      const body = (await res.json()) as { data: LenderDashboardData | NgoDashboardData }
      return body.data
    },
    enabled: institution !== undefined,
  })

  const totalOnboarded = useMemo(
    () => (dashboard?.farmersOnboardedByMonth ?? []).reduce((sum, m) => sum + m.count, 0),
    [dashboard],
  )

  if (isNgo) {
    const ngoDashboard = dashboard as NgoDashboardData | undefined
    const totalIncomeKes = (ngoDashboard?.incomeExpenseByMonth ?? []).reduce((sum, m) => sum + m.incomeKes, 0)
    const totalExpenseKes = (ngoDashboard?.incomeExpenseByMonth ?? []).reduce((sum, m) => sum + m.expenseKes, 0)
    const totalDistributionValueKes = (ngoDashboard?.inputDistributionByMonth ?? []).reduce((sum, m) => sum + m.valueKes, 0)

    return (
      <div>
        <div className="mb-4">
          <p className="text-lg font-bold text-ink">Grant Programme Dashboard</p>
          <p className="mt-0.5 text-sm text-muted">Monthly trends over the last 6 months</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <KpiCard variant="green" value={formatKes(totalIncomeKes)} label="Farmer Income (6mo)" />
          <KpiCard variant="red" value={formatKes(totalExpenseKes)} label="Farmer Expenses (6mo)" />
          <KpiCard variant="gold" value={formatKes(totalDistributionValueKes)} label="Inputs Distributed (6mo)" />
          <KpiCard variant="blue" value={totalOnboarded} label="Farmers Onboarded (6mo)" />
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <IncomeExpenseChart data={ngoDashboard?.incomeExpenseByMonth ?? []} />
          <TrendChart
            title="Input Distribution / Month"
            data={(ngoDashboard?.inputDistributionByMonth ?? []).map((m) => ({ month: m.month, count: m.count }))}
            color="bg-gold"
          />
          <TrendChart title="Farmers Onboarded / Month" data={ngoDashboard?.farmersOnboardedByMonth ?? []} color="bg-ac-blue" />
        </div>
      </div>
    )
  }

  const lenderDashboard = dashboard as LenderDashboardData | undefined
  const totalDisbursedKes = (lenderDashboard?.loansDisbursedByMonth ?? []).reduce((sum, m) => sum + m.amountKes, 0)
  const totalRejected = (lenderDashboard?.loansRejectedByMonth ?? []).reduce((sum, m) => sum + m.count, 0)

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Lender Dashboard</p>
        <p className="mt-0.5 text-sm text-muted">Monthly trends over the last 6 months</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <KpiCard variant="green" value={formatKes(totalDisbursedKes)} label="Disbursed (6mo)" />
        <KpiCard variant="blue" value={totalOnboarded} label="Farmers Onboarded (6mo)" />
        <KpiCard variant="red" value={totalRejected} label="Loans Rejected (6mo)" />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <TrendChart title="Loans Disbursed / Month" data={lenderDashboard?.loansDisbursedByMonth ?? []} color="bg-ac-green" />
        <TrendChart title="Farmers Onboarded / Month" data={lenderDashboard?.farmersOnboardedByMonth ?? []} color="bg-ac-blue" />
        <TrendChart title="Loans Rejected / Month" data={lenderDashboard?.loansRejectedByMonth ?? []} color="bg-ac-red" />
      </div>
    </div>
  )
}
