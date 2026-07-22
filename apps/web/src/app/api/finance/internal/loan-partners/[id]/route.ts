import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionWithRefresh } from '@/lib/auth'

const FINANCE_SERVICE = process.env.FINANCE_SERVICE_URL ?? ''
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_SECRET ?? ''

async function requireAdmin() {
  const auth = await getServerSessionWithRefresh()
  if (!auth || auth.session.role !== 'admin') return null
  return auth.session
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const upstream = await fetch(`${FINANCE_SERVICE}/api/v1/finance/partners/${params.id}`)
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const body = await req.text()
  const upstream = await fetch(`${FINANCE_SERVICE}/api/v1/finance/partners/${params.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-service-token': SERVICE_TOKEN,
    },
    body,
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
