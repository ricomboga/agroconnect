import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { DashboardContent } from './_components/DashboardContent'

export default async function AdminOverviewPage() {
  const session = await getServerSession()
  if (!session || (session.role as string) !== 'admin') redirect('/login')

  return <DashboardContent />
}
