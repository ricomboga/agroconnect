import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { DashboardContent } from './_components/DashboardContent'

export default async function SupplierDashboardPage() {
  const session = await getServerSession()
  if (!session || !['supplier', 'admin'].includes(session.role as string)) redirect('/login')

  return <DashboardContent />
}
