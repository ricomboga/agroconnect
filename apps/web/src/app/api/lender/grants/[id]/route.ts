import { NextResponse } from 'next/server'
import { requireLenderSession } from '@/lib/auth'

// TODO(real-data): no Grant model/endpoints exist in finance-service yet — mirrors the
// /finance/lender/loans/:id shape with mock data keyed by the grant ids returned from
// /api/lender/grants.
const MOCK_GRANTS: Record<string, { farmerId: string; type: string; amountRequestedKes: string; purpose: string }> = {
  'grant-jane-wanjiru-001': { farmerId: 'usr-jane-wanjiru', type: 'Input Access', amountRequestedKes: '60000', purpose: 'Fertiliser and certified seed for the long rains season.' },
  'grant-peter-kipchoge-002': { farmerId: 'usr-peter-kipchoge', type: 'Improved Yield', amountRequestedKes: '90000', purpose: 'Adopt improved wheat variety and soil testing programme.' },
  'grant-mary-njeri-003': { farmerId: 'usr-mary-njeri', type: 'Equipment', amountRequestedKes: '45000', purpose: 'Milking equipment for the dairy herd.' },
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const grant = MOCK_GRANTS[params.id]
  if (!grant) {
    return NextResponse.json({ message: 'Grant not found' }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      loan: {
        id: params.id,
        farmerId: grant.farmerId,
        type: grant.type,
        amountRequestedKes: grant.amountRequestedKes,
        purpose: grant.purpose,
        repaymentMonths: 0,
        creditScore: null,
        creditBand: null,
        status: 'submitted',
        approvedAmountKes: null,
        interestRatePct: null,
        rejectionReason: null,
        submittedAt: new Date().toISOString(),
      },
    },
  })
}
