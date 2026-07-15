import { NextResponse } from 'next/server'
import { requireLenderSession } from '@/lib/auth'

// TODO(real-data): finance-service has no outbound M-Pesa disbursement trigger endpoint —
// /finance/mpesa/callback is the inbound Safaricom result webhook only. This stub simulates
// the STK push round-trip with the seeded reference (docs/ui-design-reference.md) until a
// real POST /finance/mpesa/disburse endpoint exists.
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST() {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  await delay(1500)

  return NextResponse.json({ data: { mpesaRef: 'QA4K72XP', status: 'disbursed' } })
}
