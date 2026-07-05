import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { FarmerReportView } from './_components/FarmerReportView'

export default async function FarmerReportDetailPage({ params }: { params: { farmerId: string } }) {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <FarmerReportView farmerId={params.farmerId} />
}
