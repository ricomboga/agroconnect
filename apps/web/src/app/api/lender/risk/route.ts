import { NextResponse } from 'next/server'
import { requireLenderSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

// TODO(real-data): repayment-rate-by-band and monthly-disbursement trend need a Repayment model
// and historical disbursement aggregates that finance-service doesn't expose today — mocked
// with a reasonable distribution until those aggregates exist.
const MOCK_REPAYMENT_BY_BAND = [
  { band: 'A', ratePct: 97, farmers: 42 },
  { band: 'B', ratePct: 91, farmers: 68 },
  { band: 'C', ratePct: 78, farmers: 35 },
  { band: 'D', ratePct: 52, farmers: 9 },
]

const MOCK_MONTHLY_DISBURSEMENTS = [
  { month: 'Feb', amountKes: 420000 },
  { month: 'Mar', amountKes: 610000 },
  { month: 'Apr', amountKes: 380000 },
  { month: 'May', amountKes: 720000 },
  { month: 'Jun', amountKes: 540000 },
  { month: 'Jul', amountKes: 690000 },
]

const MOCK_IMPACT_METRICS = {
  avgYieldImprovementPct: 24,
  farmersWithActiveCropPct: 88,
  repeatApplicationPct: 34,
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
  const institutionBody = (await institutionRes.json().catch(() => ({}))) as { data?: { type?: string } }

  if (institutionBody.data?.type === 'ngo_grant') {
    return NextResponse.json({ data: { impact: MOCK_IMPACT_METRICS } })
  }

  return NextResponse.json({
    data: { repaymentByBand: MOCK_REPAYMENT_BY_BAND, monthlyDisbursements: MOCK_MONTHLY_DISBURSEMENTS },
  })
}
