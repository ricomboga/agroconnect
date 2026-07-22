import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionWithRefresh } from '@/lib/auth'

const AUTH = process.env.AUTH_SERVICE_URL ?? ''
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_SECRET ?? ''

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-token': SERVICE_TOKEN,
  }
}

// getServerSessionWithRefresh (not getServerSession) so an admin whose
// 15-minute access token has expired mid-form doesn't get a false
// "Forbidden" — this route only needs the session claims (not the token
// itself, since it authenticates upstream via the internal service token),
// but a session check that never refreshes would still wrongly reject a
// still-valid, just-stale-cookie session.
async function requireAdmin() {
  const auth = await getServerSessionWithRefresh()
  if (!auth || auth.session.role !== 'admin') return null
  return auth.session
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = req.nextUrl
  const upstream = await fetch(
    `${AUTH}/internal/admin/users?${searchParams.toString()}`,
    { headers: serviceHeaders() },
  )
  const body = await upstream.json()
  return NextResponse.json(body, { status: upstream.status })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  if (session.staff_role === 'moderator') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  if (session.staff_role === 'county_admin' && !session.is_super_admin) {
    body.county = session.county
  }
  body.createdByUserId = session.sub
  const upstream = await fetch(`${AUTH}/internal/admin/users`, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify(body),
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
