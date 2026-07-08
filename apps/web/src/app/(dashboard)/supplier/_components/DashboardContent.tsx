'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KpiCard, AlertBox, DataTable, StatusBadge, ProgressBar, ListRow, Avatar } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'
import { toast } from 'sonner'
import api from '@/lib/api'

interface SupplierProduct {
  id: string
  name: string
  stockQuantity: string
  unit: string
}

interface SupplierSummary {
  activeProductCount: number
  lowStockCount: number
  lowStockItems: SupplierProduct[]
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

// TODO(real-data): no sales/revenue-ledger model exists yet in market-service —
// this trend is illustrative only, matching the wireframe's static 6-month bars.
const REVENUE_TREND = [
  { month: 'Jan', pct: 45, peak: false },
  { month: 'Feb', pct: 55, peak: false },
  { month: 'Mar', pct: 65, peak: true },
  { month: 'Apr', pct: 75, peak: true },
  { month: 'May', pct: 85, peak: true },
  { month: 'Jun', pct: 100, peak: true },
] as const

// TODO(real-data): no AI-signal model (diagnosis-linked sales opportunities)
// exists yet — mirrors the wireframe's "AI Sales Opportunities" panel with mock rows.
const AI_OPPORTUNITIES = [
  { initials: 'JW', color: undefined, name: 'Jane Wanjiru', note: 'Spray Maize due today, Mancozeb 80WP out of stock on her inventory', action: '📱 SMS' },
  { initials: 'SM', color: '#0E7490', name: 'Samuel Mwas', note: '2nd Fertiliser (CAN 50kg) due Jun 10, not yet purchased', action: '📱 SMS' },
  { initials: 'GK', color: '#7C3AED', name: 'Grace Kamau', note: 'Newcastle Vaccine overdue 7 days, 50 birds at risk', action: 'Urgent' },
  { initials: 'AH', color: '#C9A84C', name: '147 farmers (Grey Leaf Spot)', note: 'AI diagnosed Grey Leaf Spot this month, Mancozeb 80WP opportunity', action: '📢 Bulk SMS' },
] as const

// TODO(real-data): no sales-aggregate model exists yet — top-selling products
// are illustrative only, matching the wireframe.
const TOP_PRODUCTS = [
  { name: 'CAN Fertiliser 50kg', detail: '284 units · KES 908K', pct: 100 },
  { name: 'Mancozeb 80WP 1kg', detail: '167 units · KES 80K', pct: 59 },
  { name: 'Maize Seed H614D', detail: '98 units · KES 417K', pct: 35 },
  { name: 'Newcastle Vaccine', detail: '61 units · KES 27K', pct: 22 },
] as const

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

      <div className="mb-4 grid grid-cols-3 gap-2.5 md:grid-cols-6">
        {summaryLoading || ordersLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-base bg-surface2" />
          ))
        ) : (
          <>
            {/* TODO(real-data): no sales-ledger model exists yet — Revenue KPI is mocked. */}
            <KpiCard variant="green" value="KES 142K" label="Revenue (Month)" delta={{ direction: 'up', text: '12% vs last month' }} />
            <KpiCard variant="gold" value={pendingCount} label="Pending Orders" delta={{ direction: 'up', text: `${formatKES(pendingValue)} value` }} />
            <KpiCard variant="green" value={activeProductCount} label="Active Products" />
            <KpiCard variant="red" value={lowStockCount} label="Low Stock Alerts" delta={{ direction: 'down', text: 'Reorder needed' }} />
            {/* TODO(real-data): no Review model exists yet — Customer Rating KPI is mocked. */}
            <KpiCard variant="teal" value="4.8 ★" label="Customer Rating" delta={{ direction: 'up', text: '142 reviews' }} />
            {/* TODO(real-data): no AI-signal model exists yet — AI Sales Leads KPI is mocked. */}
            <KpiCard variant="purple" value={18} label="AI Sales Leads" delta={{ direction: 'up', text: 'From diagnosis data' }} />
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

          <div className="rounded-base border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">🤖 AI Sales Opportunities</span>
              <StatusBadge variant="blue">From farm activity data</StatusBadge>
            </div>
            <div className="px-4 py-3">
              <div className="mb-2.5">
                <AlertBox variant="blue">
                  These farmers have upcoming activities or AI-flagged inventory gaps. Contact them proactively.
                </AlertBox>
              </div>
              {AI_OPPORTUNITIES.map((opp) => (
                <ListRow
                  key={opp.name}
                  avatar={<Avatar initials={opp.initials} color={opp.color} />}
                  title={opp.name}
                  sub={opp.note}
                  action={
                    <button
                      type="button"
                      className="rounded-md bg-ac-green px-3 py-1 text-sm font-semibold text-white"
                    >
                      {opp.action}
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3.5 rounded-base border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">Top Selling Products</span>
            </div>
            <div className="flex flex-col gap-2.5 px-4 py-3">
              {TOP_PRODUCTS.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between text-base">
                    <span>{p.name}</span>
                    <span className="font-semibold text-ac-green">{p.detail}</span>
                  </div>
                  <ProgressBar value={p.pct} color="green" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-base border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <span className="text-md font-semibold text-ink">Revenue Trend (6 months)</span>
            </div>
            <div className="px-4 py-3">
              <div className="mb-1.5 flex h-12 items-end gap-1">
                {REVENUE_TREND.map((bar) => (
                  <div
                    key={bar.month}
                    className={`flex-1 rounded-t-[2px] ${bar.peak ? 'bg-ac-green' : 'bg-ac-green-light'}`}
                    style={{ height: `${bar.pct}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-sm text-muted">
                {REVENUE_TREND.map((bar) => (
                  <span key={bar.month}>{bar.month}</span>
                ))}
              </div>
              <div className="mt-2.5">
                <AlertBox variant="green">
                  📈 June is best month. Peak aligns with planting season. Prepare stock for Jul–Aug maintenance
                  season (pesticides, fertilisers).
                </AlertBox>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
