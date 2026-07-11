import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

// TODO(real-data): finance-service has no lender notification-preferences or institution-profile
// write endpoints — mocked in-memory per server instance. operatingCounties is real (backed by
// LoanPartner.operatingCounties in finance-service), fetched/saved separately below.
let settings = {
  notifications: {
    newApplication: 'email',
    statusChange: 'sms_and_email',
    overdueAlert: 'sms',
  },
  profile: {
    contactEmail: '',
    mpesaPaybill: '',
    licenceNumber: '',
  },
}

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const token = cookies().get('__ac')?.value ?? ''
  const institutionRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const institutionBody = (await institutionRes.json().catch(() => ({}))) as {
    data?: { type?: string; operatingCounties?: string[] }
  }

  return NextResponse.json({
    data: {
      ...settings,
      institutionType: institutionBody.data?.type ?? null,
      operatingCounties: institutionBody.data?.operatingCounties ?? [],
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<typeof settings> & { operatingCounties?: string[] }
  const { operatingCounties, ...rest } = body
  settings = { ...settings, ...rest, notifications: { ...settings.notifications, ...rest.notifications }, profile: { ...settings.profile, ...rest.profile } }

  let updatedOperatingCounties: string[] | undefined
  if (operatingCounties) {
    const token = cookies().get('__ac')?.value ?? ''
    const res = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution/operating-counties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ operatingCounties }),
    })
    if (!res.ok) {
      return NextResponse.json({ message: 'Failed to save operating counties' }, { status: res.status })
    }
    const resBody = (await res.json()) as { data: { operatingCounties: string[] } }
    updatedOperatingCounties = resBody.data.operatingCounties
  }

  return NextResponse.json({ data: { ...settings, operatingCounties: updatedOperatingCounties ?? operatingCounties ?? [] } })
}
