import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { UsersTable } from './_components/UsersTable'

export default async function AdminUsersPage() {
  const session = await getServerSession()
  if (!session || (session.role as string) !== 'admin') redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage accounts, verify KYC, and control access
        </p>
      </div>
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-lg border border-gray-200 bg-white" />
        }
      >
        <UsersTable />
      </Suspense>
    </div>
  )
}
