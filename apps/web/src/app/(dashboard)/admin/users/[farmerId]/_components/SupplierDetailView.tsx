'use client'

import { useQuery } from '@tanstack/react-query'
import { WebStatCard } from '@/components/ui/WebStatCard'
import { WebDataTable } from '@/components/ui/WebDataTable'
import { AlertBox } from '@agroconnect/web-ui'

interface SupplierSummary {
  activeProductCount: number
  lowStockCount: number
  lowStockItems: { id: string; name: string; stockQuantity: number }[]
}

interface CustomerAggregate {
  buyerId: string
  orderCount: number
  totalSpentKes: number
  lastOrderAt: string
}

const CUSTOMER_COLS = [
  { key: 'buyerId',       header: 'Buyer',        width: '30%' },
  { key: 'orderCount',    header: 'Orders',       width: '20%' },
  { key: 'totalSpentKes', header: 'Total Spent',  width: '25%' },
  { key: 'lastOrderAt',   header: 'Last Order',   width: '25%' },
]

interface Props {
  supplierId: string
}

export function SupplierDetailView({ supplierId }: Props) {
  const summaryQuery = useQuery({
    queryKey: ['admin', 'supplier-summary', supplierId],
    queryFn: async () => {
      const res = await fetch(`/api/supplier/suppliers/${supplierId}/summary`)
      if (!res.ok) throw new Error('Failed to load supplier summary')
      const body = await res.json() as { data: SupplierSummary }
      return body.data
    },
  })

  const ordersQuery = useQuery({
    queryKey: ['admin', 'supplier-orders', supplierId],
    queryFn: async () => {
      const res = await fetch(`/api/supplier/suppliers/${supplierId}/orders?page_size=1`)
      if (!res.ok) return { meta: { total: 0 } }
      return res.json() as Promise<{ meta: { total: number } }>
    },
  })

  const customersQuery = useQuery({
    queryKey: ['admin', 'supplier-customers', supplierId],
    queryFn: async () => {
      const res = await fetch(`/api/supplier/suppliers/${supplierId}/customers?page_size=5`)
      if (!res.ok) return { data: [], meta: { total: 0 } }
      return res.json() as Promise<{ data: CustomerAggregate[]; meta: { total: number } }>
    },
  })

  if (summaryQuery.isLoading) {
    return (
      <div className="grid grid-cols-4 gap-[7px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[54px] animate-pulse rounded-lg bg-[#F3F4F6]" />
        ))}
      </div>
    )
  }

  const summary = summaryQuery.data
  if (!summary) {
    return <AlertBox variant="red">Could not load this supplier&apos;s catalogue data.</AlertBox>
  }

  const totalOrders = ordersQuery.data?.meta.total ?? 0
  const customers = customersQuery.data?.data ?? []
  const distinctCustomers = customersQuery.data?.meta.total ?? 0

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
        <WebStatCard value={summary.activeProductCount} label="Active Products" />
        <WebStatCard value={summary.lowStockCount} label="Low Stock Items" color="#DC2626" borderColor={summary.lowStockCount > 0 ? '#DC2626' : undefined} />
        <WebStatCard value={totalOrders} label="Total Orders" color="#0E7490" />
        <WebStatCard value={distinctCustomers} label="Distinct Customers" />
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          padding: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
          Top Customers
        </div>
        {customers.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6B7280' }}>No orders yet</p>
        ) : (
          <WebDataTable
            columns={CUSTOMER_COLS}
            data={customers.map((c) => ({
              buyerId: c.buyerId,
              orderCount: c.orderCount,
              totalSpentKes: `KES ${c.totalSpentKes.toLocaleString()}`,
              lastOrderAt: new Date(c.lastOrderAt).toLocaleDateString(),
            }))}
          />
        )}
      </div>
    </div>
  )
}
