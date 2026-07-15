import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireLenderSession } from '@/lib/auth'

// TODO(real-data): no Grant/GrantProgram model exists in finance-service — mocked in-memory
// per server instance until a real schema + endpoints are built. Keyed by user id so one
// lender's mutations aren't visible to every other lender hitting this server instance.
type Program = { id: string; name: string; totalBudgetKes: number; maxBeneficiaries: number; active: boolean }

function defaultPrograms(): Program[] {
  return [
    { id: 'gp-agra-yield-001', name: 'Improved Yield Grant', totalBudgetKes: 5_000_000, maxBeneficiaries: 200, active: true },
    { id: 'gp-agra-input-002', name: 'Input Access Grant', totalBudgetKes: 3_000_000, maxBeneficiaries: 150, active: true },
  ]
}

const programsByUser = new Map<string, Program[]>()

function programsFor(userId: string): Program[] {
  let programs = programsByUser.get(userId)
  if (!programs) {
    programs = defaultPrograms()
    programsByUser.set(userId, programs)
  }
  return programs
}

const bodySchema = z.object({
  name: z.string().min(1),
  totalBudgetKes: z.number().positive(),
  maxBeneficiaries: z.number().int().positive(),
})

export async function GET() {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ data: programsFor(session.sub) })
}

export async function POST(req: NextRequest) {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const program: Program = { id: `gp-mock-${Date.now()}`, ...parsed.data, active: true }
  programsByUser.set(session.sub, [...programsFor(session.sub), program])
  return NextResponse.json({ data: program }, { status: 201 })
}
