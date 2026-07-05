import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'

export default async function LenderRootPage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }
  redirect('/lender/pipeline')
}
