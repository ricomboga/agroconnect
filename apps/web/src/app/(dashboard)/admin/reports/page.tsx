import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { ReportsContent } from './_components/ReportsContent'

export default async function AdminReportsPage() {
  const session = await getServerSession()
  if (!session || (session.role as string) !== 'admin') redirect('/login')

  return <ReportsContent />
}
