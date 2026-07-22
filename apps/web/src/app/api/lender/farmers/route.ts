import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionWithRefresh } from '@/lib/auth'

const AUTH = process.env.AUTH_SERVICE_URL ?? ''
const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_SECRET ?? ''

// Farmer creation is restricted to NGO/grant institutions (see
// docs/architecture.md AD-001 style scoping) — banks/MFIs/saccos onboard
// farmers via loan applications, not this direct-creation flow.
export async function POST(req: NextRequest) {
  const auth = await getServerSessionWithRefresh()
  if (!auth || auth.session.role !== 'lender') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const institutionRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    cache: 'no-store',
  })
  const institutionBody = (await institutionRes.json().catch(() => ({}))) as { data?: { type?: string } }
  if (institutionBody.data?.type !== 'ngo_grant') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  body.createdByUserId = auth.session.sub
  body.role = 'farmer'

  const upstream = await fetch(`${AUTH}/internal/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-token': SERVICE_TOKEN },
    body: JSON.stringify(body),
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
