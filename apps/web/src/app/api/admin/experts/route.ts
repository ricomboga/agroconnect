import { NextRequest, NextResponse } from 'next/server'
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
  const upstream = await fetch(`${AUTH}/internal/admin/experts?${searchParams.toString()}`, {
    headers: serviceHeaders(),
  })
  const body = await upstream.json()
  return NextResponse.json(body, { status: upstream.status })
}
