import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { ReportsContent } from './_components/ReportsContent'

export default async function GovtReportsPage() {
  const session = await getServerSession()
  if (!session || !(['govt_officer', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <ReportsContent />
}
