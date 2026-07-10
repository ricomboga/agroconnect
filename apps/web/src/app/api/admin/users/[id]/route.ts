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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const upstream = await fetch(`${AUTH}/internal/admin/users/${params.id}`, {
    headers: serviceHeaders(),
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const { action, ...rest } = body as { action?: string; [k: string]: unknown }
  const url =
    action === 'verify'
      ? `${AUTH}/internal/admin/users/${params.id}/verify`
      : action === 'update'
        ? `${AUTH}/internal/admin/users/${params.id}`
        : `${AUTH}/internal/admin/users/${params.id}/status`
  const upstream = await fetch(url, {
    method: 'PATCH',
    headers: serviceHeaders(),
    body: JSON.stringify(rest),
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const upstream = await fetch(`${AUTH}/internal/admin/users/${params.id}`, {
    method: 'DELETE',
    headers: serviceHeaders(),
  })
  const result = await upstream.json()
  return NextResponse.json(result, { status: upstream.status })
}
