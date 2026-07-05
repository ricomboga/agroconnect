import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { NewProgramForm } from './_components/NewProgramForm'

export default async function GovtNewProgramPage() {
  const session = await getServerSession()
  if (!session || !(['govt_officer', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <NewProgramForm />
}
