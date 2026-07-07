import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'

const AUTH = process.env.AUTH_SERVICE_URL ?? ''
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_SECRET ?? ''

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-token': SERVICE_TOKEN,
  }
}

async function requireAdmin() {
  const session = await getServerSession()
  if (!session || session.role !== 'admin') return null
  return session
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
  const upstream = await fetch(`${AUTH}/internal/admin/users`, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify(body),
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
