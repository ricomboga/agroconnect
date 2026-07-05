import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { DashboardContent } from './_components/DashboardContent'

export default async function GovtDashboardPage() {
  const session = await getServerSession()
  if (!session || !(['govt_officer', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <DashboardContent />
}
