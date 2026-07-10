import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

const GOVT_SERVICE = process.env.GOVT_SERVICE_URL ?? ''
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_SECRET ?? ''

async function requireAdmin() {
  const session = await getServerSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const body = await req.text()
  const upstream = await fetch(`${GOVT_SERVICE}/api/v1/govt/officer-profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-token': SERVICE_TOKEN,
    },
    body,
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
