import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'

const FARM_SERVICE = process.env.FARM_SERVICE_URL ?? ''

async function farmProxy(req: NextRequest, segments: string[]) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const token = cookies().get('__ac')?.value ?? ''
  const upstreamPath = `/api/v1/${segments.join('/')}`
  const search = req.nextUrl.searchParams.toString()
  const url = `${FARM_SERVICE}${upstreamPath}${search ? `?${search}` : ''}`

  const isBodyMethod = ['POST', 'PATCH', 'PUT'].includes(req.method)
  const body = isBodyMethod ? await req.text() : undefined

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  return farmProxy(req, params.path)
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return farmProxy(req, params.path)
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return farmProxy(req, params.path)
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return farmProxy(req, params.path)
}
