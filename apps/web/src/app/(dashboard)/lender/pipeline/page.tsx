import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { PipelineQueue } from './_components/PipelineQueue'

export default async function LenderPipelinePage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <PipelineQueue />
}
