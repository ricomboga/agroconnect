import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { ProductForm } from './_components/ProductForm'

export default async function SupplierAddProductPage() {
  const session = await getServerSession()
  if (!session || !['supplier', 'admin'].includes(session.role as string)) redirect('/login')

  return (
    <Suspense fallback={<div className="h-96 rounded-base border border-border bg-surface" />}>
      <ProductForm />
    </Suspense>
  )
}
