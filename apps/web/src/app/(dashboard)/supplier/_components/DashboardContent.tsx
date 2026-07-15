'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KpiCard, AlertBox, DataTable, ProgressBar, Avatar } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'
import { toast } from 'sonner'
import api from '@/lib/api'

interface SupplierProduct {
  id: string
  name: string
  stockQuantity: string
  unit: string
}

interface RevenueMonth {
  month: string
  totalKes: number
}

interface TopProduct {
  productId: string
  name: string
  unitsSold: number
  totalKes: number
}

interface SupplierSummary {
  activeProductCount: number
  lowStockCount: number
  lowStockItems: SupplierProduct[]
  revenueMonthKes: number
  revenueTrend: RevenueMonth[]
  topProducts: TopProduct[]
}

interface Order {
  id: string
  buyerId: string
  productId: string
  quantityUnits: string
  unitPriceKes: string
  totalPriceKes: string
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered'
  createdAt: string
}

interface OrdersResponse {
  data: Order[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

function formatKES(n: number): string {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`
  return `KES ${n.toLocaleString()}`
}

export function DashboardContent() {
  const queryClient = useQueryClient()

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['supplier', 'summary'],
    queryFn: async () => {
      const res = await api.get<{ data: SupplierSummary }>('/api/supplier/suppliers/me/summary')
      return res.data.data
    },
    refetchInterval: 60_000,
  })

  const { data: pendingOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['supplier', 'orders', 'pending'],
    queryFn: async () => {
      const res = await api.get<OrdersResponse>('/api/supplier/orders', {
        params: { status: 'pending' },
      })
      return res.data
    },
    refetchInterval: 30_000,
  })

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) =>
      api.patch(`/api/supplier/orders/${orderId}/status`, { status: 'confirmed' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supplier', 'orders'] })
      toast.success('Order confirmed')
    },
    onError: () => toast.error('Failed to confirm order'),
  })

  const orders = pendingOrders?.data ?? []
  const pendingCount = pendingOrders?.meta?.total ?? orders.length
  const pendingValue = orders.reduce((sum, o) => sum + Number(o.totalPriceKes), 0)

  const activeProductCount = summary?.activeProductCount ?? 0
  const lowStockCount = summary?.lowStockCount ?? 0
  const lowStockItems = summary?.lowStockItems ?? []
  const revenueMonthKes = summary?.revenueMonthKes ?? 0
  const revenueTrend = summary?.revenueTrend ?? []
  const topProducts = summary?.topProducts ?? []

  const maxMonthKes = Math.max(0, ...revenueTrend.map((m) => m.totalKes))
  const hasRevenueTrend = maxMonthKes > 0
  const maxProductKes = Math.max(0, ...topProducts.map((p) => p.totalKes))

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'buyerId',
      header: 'Customer',
      // TODO(real-data): market-service Order rows only carry buyerId — there is
      // no join to a buyer-profile name/phone endpoint yet, so we show a
      // truncated id in place of the wireframe's customer name/avatar.
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar initials={row.buyerId.slice(0, 2).toUpperCase()} />
          <span>{row.buyerId.slice(0, 8)}…</span>
        </div>
      ),
    },
    {
      key: 'productId',
      header: 'Product',
      // TODO(real-data): no join to SupplierProduct.name from this list endpoint.
      render: (row) => <span>{row.productId.slice(0, 8)}…</span>,
    },
    { key: 'quantityUnits', header: 'Qty', render: (row) => <span>{row.quantityUnits}</span> },
    {
      key: 'totalPriceKes',
      header: 'Amount',
      render: (row) => <span>{formatKES(Number(row.totalPriceKes))}</span>,
    },
    {
      key: 'payment',
      header: 'Payment',
      // TODO(real-data): no payment/M-Pesa reference field exists on Order yet.
      render: () => <span className="text-muted">—</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <button
          type="button"
          onClick={() => confirmMutation.mutate(row.id)}
          disabled={confirmMutation.isPending}
          className="rounded-md bg-ac-green px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
        >
          Confirm
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Sales Dashboard</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {summaryLoading || ordersLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-base bg-surface2" />
          ))
        ) : (
          <>
            <KpiCard variant="green" value={formatKES(revenueMonthKes)} label="Revenue (Month)" />
            <KpiCard variant="gold" value={pendingCount} label="Pending Orders" delta={{ direction: 'up', text: `${formatKES(pendingValue)} value` }} />
            <KpiCard variant="green" value={activeProductCount} label="Active Products" />
            <KpiCard variant="red" value={lowStockCount} label="Low Stock Alerts" delta={{ direction: 'down', text: 'Reorder needed' }} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div>
          {lowStockItems.length > 0 && (
            <div className="mb-3">
              <AlertBox variant="red">
                ⚠️ {lowStockCount} products low/out of stock:{' '}
                {lowStockItems.map((p) => `${p.name} (${p.stockQuantity}${p.unit} left)`).join(', ')}
              </AlertBox>
            </div>
          )}

          <div className="mb-3.5 rounded-base border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">Pending Orders, Action Needed</span>
            </div>
            <div className="px-4 py-3">
              {orders.length === 0 ? (
                <p className="text-base text-muted">No pending orders.</p>
              ) : (
                <DataTable columns={columns} data={orders} />
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3.5 rounded-base border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">Top Selling Products</span>
            </div>
            <div className="flex flex-col gap-2.5 px-4 py-3">
              {topProducts.length === 0 ? (
                <p className="text-base text-muted">No sales yet — this fills in once orders are confirmed.</p>
              ) : (
                topProducts.map((p) => (
                  <div key={p.productId}>
                    <div className="mb-1 flex items-center justify-between text-base">
                      <span>{p.name}</span>
                      <span className="font-semibold text-ac-green">
                        {p.unitsSold} units · {formatKES(p.totalKes)}
                      </span>
                    </div>
                    <ProgressBar value={maxProductKes > 0 ? (p.totalKes / maxProductKes) * 100 : 0} color="green" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-base border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">Revenue Trend (6 months)</span>
            </div>
            <div className="px-4 py-3">
              {!hasRevenueTrend ? (
                <p className="text-base text-muted">No revenue yet — this fills in once orders are confirmed.</p>
              ) : (
                <>
                  <div className="mb-1.5 flex h-12 items-end gap-1">
                    {revenueTrend.map((bar) => (
                      <div
                        key={bar.month}
                        className={`flex-1 rounded-t-[2px] ${bar.totalKes === maxMonthKes ? 'bg-ac-green' : 'bg-ac-green-light'}`}
                        style={{ height: `${maxMonthKes > 0 ? (bar.totalKes / maxMonthKes) * 100 : 0}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-sm text-muted">
                    {revenueTrend.map((bar) => (
                      <span key={bar.month}>{bar.month}</span>
                    ))}
                  </div>
                  <div className="mt-2.5">
                    <AlertBox variant="green">
                      📈 {revenueTrend.find((m) => m.totalKes === maxMonthKes)?.month} is your best month so far.
                    </AlertBox>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
