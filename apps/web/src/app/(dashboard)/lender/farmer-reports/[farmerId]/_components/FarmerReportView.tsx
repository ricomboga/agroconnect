'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KpiCard, DataTable, StatusBadge, AlertBox, TextInput, Field } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

function formatKes(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function formatCoord(value: number): string {
  return value.toFixed(4)
}

interface Institution {
  type: 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'
}

interface FarmerReport {
  farmerId: string
  farmer: {
    fullName: string
    phone: string
    county: string | null
    subCounty: string | null
    farmerType: string | null
    memberSince: string
    kycStatus: string
  }
  creditScore: {
    score: number
    band: string
    maxLoanKes: number
    seasonsOfData: number
    breakdown: {
      harvestYieldScore: number
      inputManagementScore: number
      activityComplianceScore: number
      platformEngagementScore: number
    }
  } | null
  farm: {
    name: string
    areaAcres: number
    county: string
    soilType: string | null
    waterSource: string | null
    locationLat: number
    locationLng: number
    plots: { name: string; areaAcres: number; currentCrop: string | null; plantedAt: string | null }[]
  } | null
  activitySummary: {
    totalActivitiesLast90Days: number
    completedOnTime: number
    overdueAtQuery: number
    completionRatePct: number
    streakDays: number
    recentCompleted: { date: string; title: string; costKes: number }[]
  }
  overdueActivities: string[]
  harvestHistory: { crop: string; quantityKg: number; harvestDate: string; revenueKes: number | null }[]
  inventory: { name: string; category: string; unit: string; purchasedQty: number; remainingQty: number; purchasedAt: string }[]
  machinery: { name: string; type: string; condition: string; acquiredAt: string; disposedAt: string | null }[]
  loanHistory: { lender: string; amountKes: number; status: string; disbursedAt: string | null; termMonths: number }[]
  cashFlow: { last30DaysIncomeKes: number; last30DaysExpensesKes: number; last30DaysNetKes: number }
  riskFlags: string[]
  generatedAt: string
}

export function FarmerReportView({ farmerId }: { farmerId: string }) {
  const [harvestFrom, setHarvestFrom] = useState('')
  const [harvestTo, setHarvestTo] = useState('')
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10))

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

  const { data: report, isLoading } = useQuery({
    queryKey: ['lender', 'farmer-report', farmerId, asOfDate],
    queryFn: async () => {
      const res = await fetch(`/api/lender/farmer-reports/${farmerId}?as_of=${asOfDate}`)
      if (!res.ok) throw new Error('Failed to load farmer report')
      const body = (await res.json()) as { data: FarmerReport }
      return body.data
    },
  })

  const filteredHarvestHistory = useMemo(() => {
    if (!report) return []
    return report.harvestHistory.filter((h) => {
      if (harvestFrom && h.harvestDate < harvestFrom) return false
      if (harvestTo && h.harvestDate > harvestTo) return false
      return true
    })
  }, [report, harvestFrom, harvestTo])

  if (isLoading || !report) {
    return <p className="py-6 text-center text-sm text-muted">Loading…</p>
  }

  const harvestCols: DataTableColumn<(typeof report.harvestHistory)[number]>[] = [
    { key: 'crop', header: 'Crop' },
    { key: 'quantityKg', header: 'Yield (kg)', render: (h) => h.quantityKg.toLocaleString() },
    { key: 'harvestDate', header: 'Harvest Date', render: (h) => new Date(h.harvestDate).toLocaleDateString('en-KE') },
    { key: 'revenueKes', header: 'Revenue', render: (h) => (h.revenueKes !== null ? formatKes(h.revenueKes) : '—') },
  ]

  const inventoryCols: DataTableColumn<(typeof report.inventory)[number]>[] = [
    { key: 'name', header: 'Item' },
    { key: 'category', header: 'Category', render: (i) => <span className="capitalize">{i.category}</span> },
    { key: 'remainingQty', header: 'Qty Remaining', render: (i) => `${i.remainingQty} ${i.unit}` },
    { key: 'purchasedAt', header: 'Purchased', render: (i) => new Date(i.purchasedAt).toLocaleDateString('en-KE') },
  ]

  const machineryCols: DataTableColumn<(typeof report.machinery)[number]>[] = [
    { key: 'name', header: 'Item' },
    { key: 'type', header: 'Type', render: (m) => <span className="capitalize">{m.type}</span> },
    {
      key: 'condition',
      header: 'Condition',
      render: (m) => (
        <StatusBadge variant={m.condition === 'good' ? 'green' : m.condition === 'fair' ? 'amber' : 'red'}>
          {m.condition}
        </StatusBadge>
      ),
    },
    { key: 'acquiredAt', header: 'Acquired', render: (m) => new Date(m.acquiredAt).toLocaleDateString('en-KE') },
  ]

  const loanCols: DataTableColumn<(typeof report.loanHistory)[number]>[] = [
    { key: 'lender', header: 'Lender' },
    { key: 'amountKes', header: 'Amount', render: (l) => formatKes(l.amountKes) },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge variant="green">{l.status}</StatusBadge> },
    { key: 'disbursedAt', header: 'Disbursed', render: (l) => (l.disbursedAt ? new Date(l.disbursedAt).toLocaleDateString('en-KE') : '—') },
    { key: 'termMonths', header: 'Term (months)', render: (l) => l.termMonths },
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
          <div><p className="text-xs uppercase tracking-wide text-muted">County</p><p className="text-ink">{report.farmer.county ?? '—'}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Member Since</p><p className="text-ink">{new Date(report.farmer.memberSince).toLocaleDateString('en-KE')}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-muted">Farm Type</p><p className="text-ink capitalize">{report.farmer.farmerType ?? '—'}</p></div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">KYC Status</p>
            <StatusBadge variant={report.farmer.kycStatus === 'verified' ? 'green' : 'amber'}>{report.farmer.kycStatus}</StatusBadge>
          </div>
        </div>
      </div>

      {/* Section 2 — Credit Score (bank/MFI only — not meaningful for region-wide NGO rosters) */}
      {!isNgo && (
        <div className="rounded-base border border-border bg-white px-4 py-3">
          <p className="mb-2 text-md font-semibold text-ink">Credit Score</p>
          {report.creditScore ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <KpiCard variant="green" value={report.creditScore.score} label={`Score (Band ${report.creditScore.band})`} />
              <KpiCard variant="blue" value={formatKes(report.creditScore.maxLoanKes)} label="Max Loan" />
              <KpiCard variant="teal" value={report.creditScore.seasonsOfData} label="Seasons of Data" />
              <KpiCard variant="gold" value={report.creditScore.breakdown.activityComplianceScore} label="Activity Compliance" />
            </div>
          ) : (
            <p className="py-2 text-sm text-muted">No credit score computed for this farmer yet.</p>
          )}
        </div>
      )}

      {/* Section 3 — Farm & Plots */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Farm & Plots</p>
        {report.farm ? (
          <>
            <div className="mb-3 grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
              <div><p className="text-xs uppercase tracking-wide text-muted">Farm</p><p className="text-ink">{report.farm.name}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted">Total Acres</p><p className="text-ink">{report.farm.areaAcres}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted">Soil Type</p><p className="capitalize text-ink">{report.farm.soilType ?? '—'}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted">Water Source</p><p className="capitalize text-ink">{report.farm.waterSource ?? '—'}</p></div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">GPS Coordinates</p>
                <p className="text-ink">{formatCoord(report.farm.locationLat)}, {formatCoord(report.farm.locationLng)}</p>
              </div>
            </div>
            {report.farm.plots.length === 0 ? (
              <p className="py-2 text-sm text-muted">No plots recorded.</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'name', header: 'Plot' },
                  { key: 'areaAcres', header: 'Acres' },
                  { key: 'currentCrop', header: 'Current Crop', render: (p) => p.currentCrop ?? '—' },
                  { key: 'plantedAt', header: 'Planted', render: (p) => (p.plantedAt ? new Date(p.plantedAt).toLocaleDateString('en-KE') : '—') },
                ]}
                data={report.farm.plots}
              />
            )}
          </>
        ) : (
          <p className="py-2 text-sm text-muted">No farm registered for this farmer yet.</p>
        )}
      </div>

      {/* Section 4 — Activity Summary */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Activity Summary (last 90 days)</p>
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <KpiCard variant="green" value={report.activitySummary.totalActivitiesLast90Days} label="Activities (90 days)" />
          <KpiCard variant="blue" value={report.activitySummary.completedOnTime} label="Completed On Time" />
          <KpiCard variant="teal" value={`${report.activitySummary.completionRatePct}%`} label="Completion Rate" />
          <KpiCard variant="gold" value={report.activitySummary.streakDays} label="Streak (days)" />
        </div>
        {report.activitySummary.recentCompleted.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-sm font-semibold text-ink2">Recent Activity</p>
            <ul className="flex flex-col gap-1 text-sm text-ink2">
              {report.activitySummary.recentCompleted.map((a) => (
                <li key={`${a.title}-${a.date}`} className="flex justify-between border-b border-border py-1">
                  <span>{new Date(a.date).toLocaleDateString('en-KE')}, {a.title}</span>
                  <span className="font-medium text-ink">{formatKes(a.costKes)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.overdueActivities.length > 0 && (
          <AlertBox variant="red">
            {report.overdueActivities.map((f) => (
              <div key={f}>{f}</div>
            ))}
          </AlertBox>
        )}
      </div>

      {/* Section 5 — Harvest History & Cash Flow */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Harvest History</p>
          <div className="flex items-center gap-2">
            <TextInput type="date" value={harvestFrom} onChange={(e) => setHarvestFrom(e.target.value)} className="w-36" />
            <span className="text-sm text-muted">to</span>
            <TextInput type="date" value={harvestTo} onChange={(e) => setHarvestTo(e.target.value)} className="w-36" />
          </div>
        </div>
        {filteredHarvestHistory.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No harvests in the selected date range</p>
        ) : (
          <DataTable columns={harvestCols} data={filteredHarvestHistory} />
        )}
        <div className="mt-3 rounded-sm bg-ac-green-light px-2.5 py-1.5 text-sm text-ac-green-dark">
          Cash Flow (30 days): Income {formatKes(report.cashFlow.last30DaysIncomeKes)} / Expenses{' '}
          {formatKes(report.cashFlow.last30DaysExpensesKes)} / Net {formatKes(report.cashFlow.last30DaysNetKes)}
        </div>
      </div>

      {/* Section 6 — Inventory & Machinery (shared as-at snapshot date) */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Inventory & Machinery</p>
          <Field label="As at">
            <TextInput type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-36" />
          </Field>
        </div>
        <p className="mb-1 text-sm font-semibold text-ink2">Inventory</p>
        {report.inventory.length === 0 ? (
          <p className="py-2 text-sm text-muted">No inventory recorded as at this date.</p>
        ) : (
          <DataTable columns={inventoryCols} data={report.inventory} />
        )}
        <p className="mb-1 mt-3 text-sm font-semibold text-ink2">Machinery & Equipment</p>
        {report.machinery.length === 0 ? (
          <p className="py-2 text-sm text-muted">No machinery or equipment owned as at this date.</p>
        ) : (
          <DataTable columns={machineryCols} data={report.machinery} />
        )}
      </div>

      {/* Section 7 — Loan History & Risk Flags */}
      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">{isNgo ? 'Risk Flags' : 'Loan History & Risk Flags'}</p>
        {!isNgo && (
          report.loanHistory.length === 0 ? (
            <p className="py-2 text-sm text-muted">No loan history for this farmer.</p>
          ) : (
            <DataTable columns={loanCols} data={report.loanHistory} />
          )
        )}
        {report.riskFlags.length > 0 && (
          <div className="mt-3">
            <AlertBox variant="amber">
              {report.riskFlags.map((f) => (
                <div key={f}>{f}</div>
              ))}
            </AlertBox>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" disabled className="rounded-md bg-ac-green px-3 py-1.5 text-sm font-semibold text-white opacity-50">
            📄 Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
