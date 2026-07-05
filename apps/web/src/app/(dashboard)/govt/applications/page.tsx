import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { ApplicationsReviewQueue } from './_components/ApplicationsReviewQueue'

export default async function GovtApplicationsPage() {
  const session = await getServerSession()
  if (!session || !(['govt_officer', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <ApplicationsReviewQueue />
}
