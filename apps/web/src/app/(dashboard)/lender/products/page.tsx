import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'
import { ProductsView } from './_components/ProductsView'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

export default async function LenderProductsPage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  const token = cookies().get('__ac')?.value ?? ''
  const res = await fetch(`${FINANCE_URL}/api/v1/finance/lender/institution`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = (await res.json().catch(() => ({}))) as { data?: { type?: string } }
  if (body.data?.type === 'ngo_grant') {
    redirect('/lender/pipeline')
  }

  return <ProductsView />
}
