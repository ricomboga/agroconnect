import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { RegistrationsTable } from './_components/RegistrationsTable'

export default async function GovtRegistrationsPage() {
  const session = await getServerSession()
  if (!session || !(['govt_officer', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <RegistrationsTable />
}
