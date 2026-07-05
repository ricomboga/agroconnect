'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KpiCard, DataTable, Avatar, TextInput } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'
import api from '@/lib/api'

interface CustomerAggregate {
  buyerId: string
  orderCount: number
  totalSpentKes: number
  lastOrderAt: string
}

interface CustomersResponse {
  data: CustomerAggregate[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

function formatKES(n: number): string {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`
  return `KES ${n.toLocaleString()}`
}

export function CustomersTable() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['supplier', 'customers'],
    queryFn: async () => {
      const res = await api.get<CustomersResponse>('/api/supplier/suppliers/me/customers', {
        params: { page: 1, page_size: 100 },
      })
      return res.data
    },
  })

  const customers = data?.data ?? []
  const filtered = search
    ? customers.filter((c) => c.buyerId.toLowerCase().includes(search.toLowerCase()))
    : customers

  const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0)
  const totalSpent = customers.reduce((sum, c) => sum + Number(c.totalSpentKes), 0)
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0

  const columns: DataTableColumn<CustomerAggregate>[] = [
    {
      key: 'buyerId',
      header: 'Customer',
      // TODO(real-data): no join to a buyer-profile name endpoint from this
      // aggregate — showing a truncated id + generic avatar in its place.
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.buyerId.slice(0, 2).toUpperCase()} />
          <span>{row.buyerId.slice(0, 8)}…</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      // TODO(real-data): no phone field returned by suppliers/me/customers.
      render: () => <span className="text-muted">—</span>,
    },
    { key: 'orderCount', header: 'Orders' },
    {
      key: 'totalSpentKes',
      header: 'Total Spent',
      render: (row) => <span className="font-semibold text-ac-green">{formatKES(Number(row.totalSpentKes))}</span>,
    },
    {
      key: 'lastOrderAt',
      header: 'Last Order',
      render: (row) => <span>{new Date(row.lastOrderAt).toLocaleDateString()}</span>,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      // TODO(real-data): no credit-ledger model exists yet.
      render: () => <span className="text-muted">—</span>,
    },
    {
      key: 'aiOpportunity',
      header: 'AI Opportunity',
      // TODO(real-data): no AI-signal model exists yet.
      render: () => <span className="text-muted">—</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <button
          type="button"
          onClick={() => toast.info(`Customer detail view for ${row.buyerId.slice(0, 8)}… is not yet available`)}
          className="rounded-md bg-ac-green px-3 py-1 text-sm font-semibold text-white"
        >
          View
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Customer Accounts</p>
          <p className="text-base text-muted">{data?.meta.total ?? customers.length} customers</p>
        </div>
        <button
          type="button"
          onClick={() => toast.info('SMS campaign feature is not yet available')}
          className="rounded-md bg-ac-green px-3 py-1.5 text-base font-semibold text-white"
        >
          📢 Send SMS Campaign
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <KpiCard variant="green" value={data?.meta.total ?? customers.length} label="Total Customers" />
        {/* TODO(real-data): no credit-ledger model exists yet — Outstanding KPI is mocked. */}
        <KpiCard variant="gold" value="KES 82K" label="Outstanding (Credit)" delta={{ direction: 'down', text: '14 accounts owing' }} />
        {/* TODO(real-data): repeat-customer rate needs order-history-over-time analysis not exposed by this aggregate. */}
        <KpiCard variant="green" value="73%" label="Repeat Customers" delta={{ direction: 'up', text: 'Good loyalty' }} />
        <KpiCard variant="teal" value={formatKES(avgOrderValue)} label="Avg Order Value" />
      </div>

      <div className="rounded-base border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-md font-semibold text-ink">Customer List</span>
          <div className="w-56">
            <TextInput placeholder="🔍 Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="px-4 py-2">
          {isLoading ? (
            <p className="py-6 text-center text-base text-muted">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-base text-muted">No customers found.</p>
          ) : (
            <DataTable columns={columns} data={filtered} />
          )}
        </div>
      </div>
    </div>
  )
}
