import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'

const MEDIA_SERVICE = process.env.MEDIA_SERVICE_URL ?? ''

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const token = cookies().get('__ac')?.value ?? ''
  const contentType = req.headers.get('content-type') ?? 'multipart/form-data'
  const body = await req.blob()

  const upstream = await fetch(`${MEDIA_SERVICE}/api/v1/media/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${token}`,
    },
    body,
  })

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
