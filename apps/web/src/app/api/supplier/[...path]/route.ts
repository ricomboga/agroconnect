import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionWithRefresh } from '@/lib/auth'

const MARKET_SERVICE = process.env.MARKET_SERVICE_URL ?? 'http://localhost:3004'

async function supplierProxy(req: NextRequest, segments: string[]) {
  // getServerSessionWithRefresh (not getServerSession) so a supplier who has
  // been on a long form (e.g. Add Product) past the 15-minute access-token
  // TTL doesn't get a silent 401 on save — page navigations already get this
  // via middleware, but middleware never covers /api/* routes.
  const auth = await getServerSessionWithRefresh()
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const upstreamPath = `/api/v1/market/${segments.join('/')}`
  const search = req.nextUrl.searchParams.toString()
  const url = `${MARKET_SERVICE}${upstreamPath}${search ? `?${search}` : ''}`

  const isBodyMethod = ['POST', 'PATCH', 'PUT'].includes(req.method)
  const body = isBodyMethod ? await req.text() : undefined

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    ...(body !== undefined ? { body } : {}),
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return supplierProxy(req, params.path)
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return supplierProxy(req, params.path)
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return supplierProxy(req, params.path)
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return supplierProxy(req, params.path)
}
