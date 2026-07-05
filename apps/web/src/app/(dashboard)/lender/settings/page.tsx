import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { SettingsView } from './_components/SettingsView'

export default async function LenderSettingsPage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  return <SettingsView />
}
