import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { CustomersTable } from './_components/CustomersTable'

export default async function SupplierCustomersPage() {
  const session = await getServerSession()
  if (!session || !['supplier', 'admin'].includes(session.role as string)) redirect('/login')

  return <CustomersTable />
}
