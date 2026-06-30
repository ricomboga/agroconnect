import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { FarmDetailClient } from './_components/FarmDetailClient'

interface Props {
  params: { farmId: string }
  searchParams: { tab?: string }
}

export default async function FarmDetailPage({ params, searchParams }: Props) {
  const session = await getServerSession()
  if (!session) redirect(`/login?returnUrl=/farms/${params.farmId}`)
  if (session.role !== 'farmer' && session.role !== 'admin')
    redirect(`/login?returnUrl=/farms/${params.farmId}`)

  return (
    <FarmDetailClient
      farmId={params.farmId}
      initialTab={searchParams.tab ?? 'overview'}
    />
  )
}
