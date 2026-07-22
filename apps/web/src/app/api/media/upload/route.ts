import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionWithRefresh } from '@/lib/auth'

const MEDIA_SERVICE = process.env.MEDIA_SERVICE_URL ?? ''

export async function POST(req: NextRequest) {
  const auth = await getServerSessionWithRefresh()
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') ?? 'multipart/form-data'
  const body = await req.blob()

  const upstream = await fetch(`${MEDIA_SERVICE}/api/v1/media/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${auth.token}`,
    },
    body,
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
