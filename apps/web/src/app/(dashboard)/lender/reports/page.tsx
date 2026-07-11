import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { ReportsView } from './_components/ReportsView'

export default async function LenderReportsPage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <ReportsView />
}
