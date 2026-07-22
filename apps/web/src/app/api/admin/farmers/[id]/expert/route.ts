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

async function requireAdmin() {
  const auth = await getServerSessionWithRefresh()
  if (!auth || auth.session.role !== 'admin') return null
  return auth.session
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const upstream = await fetch(`${AUTH}/internal/admin/farmers/${params.id}/expert`, {
    method: 'PATCH',
    headers: serviceHeaders(),
    body: JSON.stringify(body),
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
