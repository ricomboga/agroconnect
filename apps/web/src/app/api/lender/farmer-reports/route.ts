import { NextResponse } from 'next/server'
import { requireLenderSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

interface LoanRow {
  id: string
  farmerId: string
  creditScore: string | null
  creditBand: string | null
}

interface FarmersListReportRow {
  farmerId: string
  idNumber: string | null
  fullName: string | null
  phone: string | null
  county: string | null
  subCounty: string | null
  areaAcres: number | null
  farmerType: string | null
}

export async function GET() {
  const auth = await requireLenderSession()
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const institutionRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    cache: 'no-store',
  })
  const institutionBody = (await institutionRes.json().catch(() => ({}))) as {
    data?: { type?: string }
  }

  const isNgo = institutionBody.data?.type === 'ngo_grant'

  // Farmer roster (all institution types): resolved server-side by farmerRosterService —
  // NGOs get their county-based roster plus admin-assigned farmers; banks/MFIs/saccos/mobile
  // lenders get every farmer with a FarmerLenderAssignment to this partner. This is the same
  // source the admin farmer list reads, so an admin assignment shows up here immediately,
  // regardless of whether that farmer has ever submitted a loan application.
  const [reportRes, loansRes] = await Promise.all([
    fetch(`${FINANCE_URL}/api/v1/finance/lender/reports/farmers`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      cache: 'no-store',
    }),
    isNgo
      ? null
      : fetch(`${FINANCE_URL}/api/v1/finance/lender/loans`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          cache: 'no-store',
        }),
  ])
  if (!reportRes.ok) {
    return NextResponse.json({ data: [] })
  }
  const reportBody = (await reportRes.json()) as { data: FarmersListReportRow[] }

  // Credit score/band only apply to banks/MFIs/saccos/mobile lenders, overlaid per farmer from
  // their loan pipeline where a loan application exists.
  const loanByFarmer = new Map<string, LoanRow>()
  if (loansRes?.ok) {
    const loansBody = (await loansRes.json()) as { data: { loans: LoanRow[] } }
    for (const loan of loansBody.data.loans) {
      if (!loanByFarmer.has(loan.farmerId)) loanByFarmer.set(loan.farmerId, loan)
    }
  }

  const rows = reportBody.data.map((r) => {
    const loan = loanByFarmer.get(r.farmerId)
    return {
      farmerId: r.farmerId,
      idNumber: r.idNumber,
      fullName: r.fullName,
      phone: r.phone,
      county: r.county,
      score: loan && loan.creditScore !== null ? Number(loan.creditScore) : null,
      band: loan ? loan.creditBand : null,
      // TODO(real-data): activities/mo, completion %, overdue count and last-harvest date need
      // farm-service activity/harvest aggregates that farmerReportService doesn't expose per-farmer
      // outside of a full report fetch — left null and rendered as "—" in the UI.
      activitiesPerMonth: null,
      completionPct: null,
      overdueCount: null,
      lastHarvest: null,
    }
  })

  return NextResponse.json({ data: rows })
}
