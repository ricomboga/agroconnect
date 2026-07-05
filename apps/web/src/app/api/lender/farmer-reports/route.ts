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

// TODO(real-data): matches docs/ui-design-reference.md's three seeded test farmers — NGO
// institutions have no loan pipeline to derive a farmer list from (no Grant model exists yet).
const MOCK_NGO_FARMERS = [
  { farmerId: 'usr-jane-wanjiru', county: 'Nakuru', score: 73, band: 'B', activitiesPerMonth: 19, completionPct: 89, overdueCount: 2, lastHarvest: '2025-01-20' },
  { farmerId: 'usr-peter-kipchoge', county: 'Uasin Gishu', score: 81, band: 'A', activitiesPerMonth: 22, completionPct: 94, overdueCount: 0, lastHarvest: '2025-02-10' },
  { farmerId: 'usr-mary-njeri', county: 'Meru', score: 58, band: 'C', activitiesPerMonth: 11, completionPct: 72, overdueCount: 1, lastHarvest: '2024-12-05' },
]

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
    return NextResponse.json({ data: MOCK_NGO_FARMERS })
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
    // TODO(real-data): county isn't a column on LoanApplication and there's no cross-service
    // join to the farmer's profile (CLAUDE.md AD-001) — not available from finance-service.
    county: null,
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
