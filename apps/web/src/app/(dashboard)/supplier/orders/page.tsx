import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { OrdersView } from './_components/OrdersView'

export default async function SupplierOrdersPage() {
  const session = await getServerSession()
  if (!session || !['supplier', 'admin'].includes(session.role as string)) redirect('/login')

  return (
    <Suspense fallback={<div className="h-96 rounded-base border border-border bg-surface" />}>
      <OrdersView />
    </Suspense>
  )
}
