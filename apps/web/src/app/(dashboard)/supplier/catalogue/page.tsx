import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { CatalogueTable } from './_components/CatalogueTable'

export default async function SupplierCataloguePage() {
  const session = await getServerSession()
  if (!session || !['supplier', 'admin'].includes(session.role as string)) redirect('/login')

  return <CatalogueTable />
}
