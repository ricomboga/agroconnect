import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth'

// TODO(real-data): no Grant/GrantProgram model exists in finance-service — mocked in-memory
// per server instance until a real schema + endpoints are built.
let programs = [
  { id: 'gp-agra-yield-001', name: 'Improved Yield Grant', totalBudgetKes: 5_000_000, maxBeneficiaries: 200, active: true },
  { id: 'gp-agra-input-002', name: 'Input Access Grant', totalBudgetKes: 3_000_000, maxBeneficiaries: 150, active: true },
]

const bodySchema = z.object({
  name: z.string().min(1),
  totalBudgetKes: z.number().positive(),
  maxBeneficiaries: z.number().int().positive(),
})

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ data: programs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const program = { id: `gp-mock-${Date.now()}`, ...parsed.data, active: true }
  programs = [...programs, program]
  return NextResponse.json({ data: program }, { status: 201 })
}
