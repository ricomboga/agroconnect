import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'

// TODO(real-data): PATCH /finance/grants/:grantId/status has no backend — no Grant model exists
// in finance-service. Echoes the requested change back so the decision UI is exercisable.
const bodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
  approved_amount_kes: z.number().positive().optional(),
  rejection_reason: z.string().max(500).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  return NextResponse.json({ data: { id: params.id, ...parsed.data } })
}
