import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { RiskAnalyticsView } from './_components/RiskAnalyticsView'

export default async function LenderRiskPage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <RiskAnalyticsView />
}
