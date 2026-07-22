import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionWithRefresh } from '@/lib/auth'

const FINANCE_SERVICE = process.env.FINANCE_SERVICE_URL ?? ''

async function financeProxy(req: NextRequest, segments: string[]) {
  // getServerSessionWithRefresh (not getServerSession) so a session whose
  // 15-minute access token has expired mid-form doesn't get a silent 401 —
  // page navigations already get this via middleware, but middleware never
  // covers /api/* routes.
  const auth = await getServerSessionWithRefresh()
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const upstreamPath = `/api/v1/finance/${segments.join('/')}`
  const search = req.nextUrl.searchParams.toString()
  const url = `${FINANCE_SERVICE}${upstreamPath}${search ? `?${search}` : ''}`

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
  return financeProxy(req, params.path)
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return financeProxy(req, params.path)
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return financeProxy(req, params.path)
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return financeProxy(req, params.path)
}
