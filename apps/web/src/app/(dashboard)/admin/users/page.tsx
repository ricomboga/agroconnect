import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { UsersTable } from './_components/UsersTable'

export default async function AdminUsersPage() {
  const session = await getServerSession()
  if (!session || (session.role as string) !== 'admin') redirect('/login')

  return (
    <Suspense fallback={<div style={{ height: 384, backgroundColor: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }} />}>
      <UsersTable />
    </Suspense>
  )
}
