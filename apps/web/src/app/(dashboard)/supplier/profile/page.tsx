import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { ProfileReviews } from './_components/ProfileReviews'

export default async function SupplierProfilePage() {
  const session = await getServerSession()
  if (!session || !['supplier', 'admin'].includes(session.role as string)) redirect('/login')

  return <ProfileReviews />
}
