import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { FarmerReportsList } from './_components/FarmerReportsList'

export default async function FarmerReportsPage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <FarmerReportsList />
}
