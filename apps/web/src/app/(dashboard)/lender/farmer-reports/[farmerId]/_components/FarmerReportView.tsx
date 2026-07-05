'use client'

import { useQuery } from '@tanstack/react-query'
import { KpiCard, DataTable, StatusBadge, ProgressBar, AlertBox } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'
import type { MockFarmerReport } from '../../../../../api/lender/_mock/farmerReportSeed'

function formatKes(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function scoreBarColor(score: number): 'green' | 'amber' | 'red' {
  const pct = (score / 25) * 100
  if (pct >= 75) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

export function FarmerReportView({ farmerId }: { farmerId: string }) {
  const { data: report } = useQuery({
    queryKey: ['lender', 'farmer-report', farmerId],
    queryFn: async () => {
      const res = await fetch(`/api/lender/farmer-reports/${farmerId}`)
      if (!res.ok) throw new Error('Failed to load farmer report')
      const body = (await res.json()) as { data: MockFarmerReport }
      return body.data
    },
  })

  if (!report) {
    return <p className="py-6 text-center text-sm text-muted">Loading…</p>
  }

  const totalScore =
    report.creditScore.breakdown.harvestYieldScore +
    report.creditScore.breakdown.inputManagementScore +
    report.creditScore.breakdown.activityComplianceScore +
    report.creditScore.breakdown.platformEngagementScore

  const plotCols: DataTableColumn<(typeof report.farm.plots)[number]>[] = [
    { key: 'name', header: 'Plot' },
    { key: 'areaAcres', header: 'Acres' },
    { key: 'currentCrop', header: 'Current Crop' },
    { key: 'plantedAt', header: 'Planted', render: (p) => new Date(p.plantedAt).toLocaleDateString('en-KE') },
  ]

  const harvestCols: DataTableColumn<(typeof report.harvestHistory)[number]>[] = [
    { key: 'season', header: 'Season' },
    { key: 'crop', header: 'Crop' },
    { key: 'quantityKg', header: 'Yield (kg)', render: (h) => h.quantityKg.toLocaleString() },
    { key: 'revenueKes', header: 'Revenue', render: (h) => formatKes(h.revenueKes) },
    { key: 'costsKes', header: 'Costs', render: (h) => formatKes(h.costsKes) },
    { key: 'profitKes', header: 'Profit', render: (h) => formatKes(h.profitKes) },
  ]

  const loanCols: DataTableColumn<(typeof report.loanHistory)[number]>[] = [
    { key: 'lender', header: 'Lender' },
    { key: 'amountKes', header: 'Amount', render: (l) => formatKes(l.amountKes) },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge variant="green">{l.status}</StatusBadge> },
    { key: 'paymentsCompleted', header: 'Payments', render: (l) => `${l.paymentsCompleted}/${l.termMonths}` },
    { key: 'onTimePayments', header: 'On-time', render: (l) => l.onTimePayments },
  ]

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="text-lg font-bold text-ink">Farmer Report</p>
        <p className="mt-0.5 text-sm text-muted">Comprehensive credit / impact assessment</p>
      </div>

      {/* Section 1 — Farmer Profile */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Farmer Profile</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <div><p className="text-xs uppercase tracking-wide text-muted">Full Name</p><p className="text-ink">{report.farmer.fullName}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Phone</p><p className="text-ink">{report.farmer.phone}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">County</p><p className="text-ink">{report.farmer.county}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Member Since</p><p className="text-ink">{new Date(report.farmer.memberSince).toLocaleDateString('en-KE')}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Farm Type</p><p className="text-ink capitalize">{report.farmer.farmerType}</p></div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">KYC Status</p>
            <StatusBadge variant={report.farmer.kycStatus === 'verified' ? 'green' : 'amber'}>{report.farmer.kycStatus}</StatusBadge>
          </div>
        </div>
      </div>

      {/* Section 2 — Credit Score */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Credit Score</p>
        <div className="mb-3 text-4xl font-extrabold text-ac-green">
          {totalScore}
          <span className="text-sm font-normal text-muted"> / 100 — Band {report.creditScore.band}</span>
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
      </div>

      {/* Section 3 — Farm & Plots */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Farm & Plots</p>
        <div className="mb-3 grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
          <div><p className="text-xs uppercase tracking-wide text-muted">Farm</p><p className="text-ink">{report.farm.name}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Total Acres</p><p className="text-ink">{report.farm.areaAcres}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Soil Type</p><p className="capitalize text-ink">{report.farm.soilType}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Water Source</p><p className="capitalize text-ink">{report.farm.waterSource}</p></div>
        </div>
        <DataTable columns={plotCols} data={report.farm.plots} />
      </div>

      {/* Section 4 — Activity Summary */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Activity Summary</p>
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <KpiCard variant="green" value={report.activitySummary.totalActivitiesLast90Days} label="Activities (90 days)" />
          <KpiCard variant="blue" value={report.activitySummary.completedOnTime} label="Completed On Time" />
          <KpiCard variant="teal" value={`${report.activitySummary.completionRatePct}%`} label="Completion Rate" />
          <KpiCard variant="gold" value={report.activitySummary.streakDays} label="Streak (days)" />
        </div>
        <div className="mb-3">
          <p className="mb-1 text-sm font-semibold text-ink2">Recent Activity</p>
          <ul className="flex flex-col gap-1 text-sm text-ink2">
            {report.activitySummary.recentCompleted.map((a) => (
              <li key={a.title} className="flex justify-between border-b border-border py-1">
                <span>{new Date(a.date).toLocaleDateString('en-KE')} — {a.title}</span>
                <span className="font-medium text-ink">{formatKes(a.costKes)}</span>
              </li>
            ))}
          </ul>
        </div>
        {report.overdueActivities.length > 0 && (
          <AlertBox variant="red">
            {report.overdueActivities.map((f) => (
              <div key={f}>{f}</div>
            ))}
          </AlertBox>
        )}
      </div>

      {/* Section 5 — Harvest & Financial History */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Harvest & Financial History</p>
        <DataTable columns={harvestCols} data={report.harvestHistory} />
        <div className="mt-3 rounded-sm bg-ac-green-light px-2.5 py-1.5 text-sm text-ac-green-dark">
          Cash Flow (30 days): Income {formatKes(report.cashFlow.last30DaysIncomeKes)} / Expenses{' '}
          {formatKes(report.cashFlow.last30DaysExpensesKes)} / Net {formatKes(report.cashFlow.last30DaysNetKes)}
        </div>
      </div>

      {/* Section 6 — Loan History & Risk Flags */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Loan History & Risk Flags</p>
        <DataTable columns={loanCols} data={report.loanHistory} />
        {report.riskFlags.length > 0 && (
          <div className="mt-3">
            <AlertBox variant="amber">
              {report.riskFlags.map((f) => (
                <div key={f}>{f}</div>
              ))}
            </AlertBox>
          </div>
        )}
        {/* TODO(real-data): GET /api/v1/farms/{farmId}/report exists in farm-service, but this
            mock farmer report has no real farmId to pass it — wire once farmer-reports resolves
            to real farm-service records. */}
        <div className="mt-3 flex gap-2">
          <button type="button" disabled className="rounded-md bg-ac-green px-3 py-1.5 text-sm font-semibold text-white opacity-50">
            📄 Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
