import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

const MARKET_SERVICE = process.env.MARKET_SERVICE_URL ?? 'http://localhost:3004'
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_SECRET ?? ''

async function requireAdmin() {
  const session = await getServerSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ message: 'userId is required' }, { status: 400 })
  }
  const upstream = await fetch(`${MARKET_SERVICE}/api/v1/market/supplier-profiles?userId=${userId}`)
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const body = await req.text()
  const upstream = await fetch(`${MARKET_SERVICE}/internal/supplier-profiles`, {
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
