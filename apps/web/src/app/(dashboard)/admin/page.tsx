import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { SummaryCards } from './_components/SummaryCards'

export default async function AdminOverviewPage() {
  const session = await getServerSession()
  if (!session || (session.role as string) !== 'admin') redirect('/login')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform summary — auto-refreshes every 60 seconds
        </p>
      </div>
      <SummaryCards />
    </div>
  )
}
