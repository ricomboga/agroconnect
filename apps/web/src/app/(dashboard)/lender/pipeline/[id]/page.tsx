import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { ApplicationDetail } from './_components/ApplicationDetail'

export default async function LenderApplicationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <ApplicationDetail loanId={params.id} />
}
