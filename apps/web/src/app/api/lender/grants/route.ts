import { NextResponse } from 'next/server'
import { requireLenderSession } from '@/lib/auth'

// TODO(real-data): finance-service has no Grant/GrantApplication model — NGO institutions
// (institutionType = 'ngo_grant') have no backing loan pipeline since LoanApplication is a
// bank/MFI concept only. This mirrors the real /finance/lender/loans response shape with mock
// rows matching the seeded farmer data in docs/ui-design-reference.md until a real grants
// schema + endpoints exist in finance-service.
const MOCK_GRANTS = [
  {
    id: 'grant-jane-wanjiru-001',
    farmerId: 'usr-jane-wanjiru',
    type: 'Input Access',
    amountRequestedKes: '60000',
    creditScore: '73',
    creditBand: 'B',
    status: 'submitted',
    submittedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'grant-peter-kipchoge-002',
    farmerId: 'usr-peter-kipchoge',
    type: 'Improved Yield',
    amountRequestedKes: '90000',
    creditScore: '81',
    creditBand: 'A',
    status: 'under_review',
    submittedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'grant-mary-njeri-003',
    farmerId: 'usr-mary-njeri',
    type: 'Equipment',
    amountRequestedKes: '45000',
    creditScore: '58',
    creditBand: 'C',
    status: 'approved',
    submittedAt: '2026-04-11T00:00:00.000Z',
  },
]

export async function GET() {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: { loans: MOCK_GRANTS } })
}
