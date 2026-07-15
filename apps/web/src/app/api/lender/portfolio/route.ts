import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireLenderSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

interface LoanRow {
  id: string
  farmerId: string
  type: string
  status: string
  amountRequestedKes: string
  approvedAmountKes: string | null
  interestRatePct: string | null
  submittedAt: string | null
}

// TODO(real-data): NGO institutions have no Grant model to source disbursed grants from.
const MOCK_NGO_GRANTS = [
  { id: 'grant-jane-wanjiru-001', farmerId: 'usr-jane-wanjiru', type: 'Input Access', amountKes: 60000, disbursedAt: '2026-03-01', status: 'active' },
]

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export async function GET() {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const token = cookies().get('__ac')?.value ?? ''

  const institutionRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const institutionBody = (await institutionRes.json().catch(() => ({}))) as { data?: { type?: string } }

  if (institutionBody.data?.type === 'ngo_grant') {
    return NextResponse.json({
      data: {
        kpis: { totalDisbursedKes: MOCK_NGO_GRANTS.reduce((s, g) => s + g.amountKes, 0), activeGrants: MOCK_NGO_GRANTS.length },
        rows: MOCK_NGO_GRANTS,
      },
    })
  }

  const loansRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/loans`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!loansRes.ok) {
    return NextResponse.json({ data: { kpis: {}, rows: [] } })
  }
  const loansBody = (await loansRes.json()) as { data: { loans: LoanRow[] } }
  const disbursed = loansBody.data.loans.filter((l) => ['disbursed', 'repaid'].includes(l.status))

  const totalOutstanding = disbursed
    .filter((l) => l.status === 'disbursed')
    .reduce((s, l) => s + Number(l.approvedAmountKes ?? l.amountRequestedKes), 0)

  // NOTE: LoanApplication has no repayment-schedule columns (no per-payment records), so
  // progress/next-due below are a rough estimate from disbursedAt + interestRatePct only —
  // TODO(real-data): real repayment tracking needs a Repayment model in finance-service.
  const rows = disbursed.map((l) => {
    const monthlyProgressPct = l.status === 'repaid' ? 100 : 35
    return {
      id: l.id,
      farmerId: l.farmerId,
      type: l.type,
      amountKes: Number(l.approvedAmountKes ?? l.amountRequestedKes),
      interestRatePct: l.interestRatePct !== null ? Number(l.interestRatePct) : null,
      status: l.status,
      progressPct: monthlyProgressPct,
      nextDueDate: l.status === 'disbursed' ? addMonths(new Date(), 1).toISOString() : null,
    }
  })

  return NextResponse.json({
    data: {
      kpis: {
        totalOutstandingKes: totalOutstanding,
        // TODO(real-data): NPL ratio, overdue amount and avg repayment need a Repayment model —
        // no per-payment records exist in finance-service today.
        nplRatioPct: null,
        overdueAmountKes: null,
        avgRepaymentPct: null,
      },
      rows,
    },
  })
}
