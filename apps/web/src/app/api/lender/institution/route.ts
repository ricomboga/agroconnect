import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireLenderSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

export async function GET() {
  const session = await requireLenderSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const token = cookies().get('__ac')?.value ?? ''
  const upstream = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  const body = await upstream.json().catch(() => ({}))
  return NextResponse.json(body, { status: upstream.status })
}
