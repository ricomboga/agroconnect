import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireLenderSession } from '@/lib/auth'

// TODO(real-data): finance-service's /finance/products route is read-only (GET list/get-by-id
// only) — no POST/PATCH exists to create or edit a LoanProduct yet. Echoes the submitted product
// back so the Add/Edit Loan Product form is exercisable until a real write endpoint is added.
const bodySchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  minAmountKes: z.number().positive(),
  maxAmountKes: z.number().positive(),
  interestRate: z.number().positive(),
  repaymentMonths: z.number().int().positive(),
  eligibilityBand: z.enum(['A', 'B', 'C', 'D', 'ineligible']),
})

export async function POST(req: NextRequest) {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  return NextResponse.json({ data: { id: `prod-mock-${Date.now()}`, ...parsed.data } }, { status: 201 })
}
