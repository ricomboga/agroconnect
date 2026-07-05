import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

// TODO(real-data): finance-service has no lender notification-preferences or institution-profile
// write endpoints — mocked in-memory per server instance.
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
  return NextResponse.json({ data: settings })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<typeof settings>
  settings = { ...settings, ...body, notifications: { ...settings.notifications, ...body.notifications }, profile: { ...settings.profile, ...body.profile } }
  return NextResponse.json({ data: settings })
}
