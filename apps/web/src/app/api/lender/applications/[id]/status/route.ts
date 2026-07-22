import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireLenderSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

const bodySchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected']),
  approved_amount_kes: z.number().positive().optional(),
  interest_rate_pct: z.number().positive().optional(),
  rejection_reason: z.string().max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireLenderSession()
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const upstream = await fetch(
    `${FINANCE_URL}/api/v1/finance/lender/loans/${params.id}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(parsed.data),
    },
  )

  const body = await upstream.json().catch(() => ({}))
  return NextResponse.json(body, { status: upstream.status })
}
