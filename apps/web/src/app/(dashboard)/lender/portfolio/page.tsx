import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { PortfolioView } from './_components/PortfolioView'

export default async function LenderPortfolioPage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <PortfolioView />
}
