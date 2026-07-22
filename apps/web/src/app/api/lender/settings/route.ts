import { NextRequest, NextResponse } from 'next/server'
import { requireLenderSession } from '@/lib/auth'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

// TODO(real-data): finance-service has no lender notification-preferences or institution-profile
// write endpoints — mocked in-memory per server instance. operatingCounties is real (backed by
// LoanPartner.operatingCounties in finance-service), fetched/saved separately below. Keyed by
// user id so one lender's mutations aren't visible to every other lender hitting this server
// instance.
interface Settings {
  notifications: { newApplication: string; statusChange: string; overdueAlert: string }
  profile: { contactEmail: string; mpesaPaybill: string; licenceNumber: string }
}

function defaultSettings(): Settings {
  return {
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
}

const settingsByUser = new Map<string, Settings>()

function settingsFor(userId: string): Settings {
  let settings = settingsByUser.get(userId)
  if (!settings) {
    settings = defaultSettings()
    settingsByUser.set(userId, settings)
  }
  return settings
}

export async function GET() {
  const auth = await requireLenderSession()
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const institutionRes = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    cache: 'no-store',
  })
  const institutionBody = (await institutionRes.json().catch(() => ({}))) as {
    data?: { type?: string; operatingCounties?: string[] }
  }

  return NextResponse.json({
    data: {
      ...settingsFor(auth.session.sub),
      institutionType: institutionBody.data?.type ?? null,
      operatingCounties: institutionBody.data?.operatingCounties ?? [],
    },
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireLenderSession()
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Settings> & { operatingCounties?: string[] }
  const { operatingCounties, ...rest } = body
  const current = settingsFor(auth.session.sub)
  const updated: Settings = {
    ...current,
    ...rest,
    notifications: { ...current.notifications, ...rest.notifications },
    profile: { ...current.profile, ...rest.profile },
  }
  settingsByUser.set(auth.session.sub, updated)

  let updatedOperatingCounties: string[] | undefined
  if (operatingCounties) {
    const res = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution/operating-counties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ operatingCounties }),
    })
    if (!res.ok) {
      return NextResponse.json({ message: 'Failed to save operating counties' }, { status: res.status })
    }
    const resBody = (await res.json()) as { data: { operatingCounties: string[] } }
    updatedOperatingCounties = resBody.data.operatingCounties
  }

  return NextResponse.json({ data: { ...updated, operatingCounties: updatedOperatingCounties ?? operatingCounties ?? [] } })
}
