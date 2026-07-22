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
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const { action, is_active, reason, ...rest } = body as {
    action?: string
    is_active?: boolean
    reason?: string
    [k: string]: unknown
  }

  let url: string
  let payload: Record<string, unknown> = rest

  if (action === 'verify' || action === 'reject') {
    // KYC business-document review (the "✓ Verify" / "✗ Reject" buttons in
    // UsersTable — gated on kyc_status, distinct from account maker-checker verify).
    url = `${AUTH}/internal/admin/users/${params.id}/kyc`
    payload = {
      decision: action === 'verify' ? 'approved' : 'rejected',
      reason: reason && reason.trim().length > 0 ? reason : `${action === 'verify' ? 'Approved' : 'Rejected'} via admin portal`,
      actor: session.sub,
    }
  } else if (action === 'verify_account') {
    // Account-status maker-checker verify: the calling admin can never verify a
    // user they created themselves (enforced server-side).
    url = `${AUTH}/internal/admin/users/${params.id}/verify`
    payload = { verifierId: session.sub }
  } else if (action === 'update') {
    url = `${AUTH}/internal/admin/users/${params.id}`
  } else if (action === 'reset_pin') {
    url = `${AUTH}/internal/admin/users/${params.id}/reset-pin`
    payload = { resetByUserId: session.sub }
  } else {
    // Legacy toggle payload ({ is_active }) maps onto the account status enum.
    url = `${AUTH}/internal/admin/users/${params.id}/status`
    payload = typeof is_active === 'boolean' ? { status: is_active ? 'active' : 'disabled' } : {}
  }

  const upstream = await fetch(url, {
    method: 'PATCH',
    headers: serviceHeaders(),
    body: JSON.stringify(payload),
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
