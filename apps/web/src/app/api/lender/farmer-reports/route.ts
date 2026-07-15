import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

interface LoanRow {
  id: string
  farmerId: string
  creditScore: string | null
  creditBand: string | null
}

interface FarmersListReportRow {
  farmerId: string
  fullName: string | null
  phone: string | null
  county: string | null
  subCounty: string | null
  areaAcres: number | null
  farmerType: string | null
}

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const token = cookies().get('__ac')?.value ?? ''

  const institutionRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const institutionBody = (await institutionRes.json().catch(() => ({}))) as {
    data?: { type?: string }
  }

  if (institutionBody.data?.type === 'ngo_grant') {
    // NGOs operate region-wide (see LoanPartner.operatingCounties), so their farmer roster
    // is every farmer with a farm in their operating counties, not loan/grant applicants.
    const reportRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/reports/farmers`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!reportRes.ok) {
      return NextResponse.json({ data: [] })
    }
    const reportBody = (await reportRes.json()) as { data: FarmersListReportRow[] }
    const rows = reportBody.data.map((r) => ({
      farmerId: r.farmerId,
      fullName: r.fullName,
      phone: r.phone,
      county: r.county,
      band: null,
      score: null,
      // TODO(real-data): per-farmer activity/completion/overdue/last-harvest aggregates
      // require a farm-service activity join not yet exposed per-farmer outside a full report.
      activitiesPerMonth: null,
      completionPct: null,
      overdueCount: null,
      lastHarvest: null,
    }))
    return NextResponse.json({ data: rows })
  }

  const loansRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/loans`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!loansRes.ok) {
    return NextResponse.json({ data: [] })
  }
  const loansBody = (await loansRes.json()) as { data: { loans: LoanRow[] } }

  const byFarmer = new Map<string, LoanRow>()
  for (const loan of loansBody.data.loans) {
    if (!byFarmer.has(loan.farmerId)) byFarmer.set(loan.farmerId, loan)
  }

  const rows = [...byFarmer.values()].map((loan) => ({
    farmerId: loan.farmerId,
    // TODO(real-data): county/phone aren't columns on LoanApplication and there's no cross-service
    // join to the farmer's profile (CLAUDE.md AD-001) — not available from finance-service.
    county: null,
    phone: null,
    score: loan.creditScore !== null ? Number(loan.creditScore) : null,
    band: loan.creditBand,
    // TODO(real-data): activities/mo, completion %, overdue count and last-harvest date need
    // farm-service activity/harvest aggregates that farmerReportService doesn't expose per-farmer
    // outside of a full report fetch — left null and rendered as "—" in the UI.
    activitiesPerMonth: null,
    completionPct: null,
    overdueCount: null,
    lastHarvest: null,
  }))

  return NextResponse.json({ data: rows })
}
