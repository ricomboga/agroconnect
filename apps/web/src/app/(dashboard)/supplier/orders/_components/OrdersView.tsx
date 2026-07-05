'use client'

import { useMemo, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBadge, WizardBar, AlertBox, Select } from '@agroconnect/web-ui'
import type { StatusBadgeVariant } from '@agroconnect/web-ui'
import { toast } from 'sonner'
import api from '@/lib/api'

type OrderStatus = 'pending' | 'confirmed' | 'dispatched' | 'delivered'

interface Order {
  id: string
  buyerId: string
  productId: string
  quantityUnits: string
  unitPriceKes: string
  totalPriceKes: string
  deliveryAddress: string
  notes?: string
  status: OrderStatus
  createdAt: string
}

interface OrdersResponse {
  data: Order[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

const STATUS_BADGE: Record<OrderStatus, { variant: StatusBadgeVariant; label: string }> = {
  pending: { variant: 'amber', label: 'New' },
  confirmed: { variant: 'blue', label: 'Confirmed' },
  dispatched: { variant: 'teal', label: 'Dispatched' },
  delivered: { variant: 'green', label: 'Delivered' },
}

const STEPS = ['Order Received', 'Confirm & Pack', 'Dispatch', 'Delivered']
const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'dispatched', 'delivered']

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'dispatched',
  dispatched: 'delivered',
}

const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: '✅ Confirm & Pack',
  confirmed: '🚚 Mark Dispatched',
  dispatched: '✓ Mark Delivered',
}

function formatKES(n: number): string {
  return `KES ${n.toLocaleString()}`
}

export function OrdersView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const statusFilter = (searchParams.get('status') ?? '') as OrderStatus | ''
  const selectedId = searchParams.get('order') ?? undefined

  const { data, isLoading } = useQuery({
    queryKey: ['supplier', 'my-orders', statusFilter],
    queryFn: async () => {
      const res = await api.get<OrdersResponse>('/api/supplier/suppliers/me/orders', {
        params: { ...(statusFilter ? { status: statusFilter } : {}), page: 1, page_size: 50 },
      })
      return res.data
    },
  })

  const orders = data?.data ?? []
  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? orders[0],
    [orders, selectedId],
  )

  function selectOrder(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('order', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  function setStatusFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('status', value)
    else params.delete('status')
    params.delete('order')
    router.push(`${pathname}?${params.toString()}`)
  }

  const advanceMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      api.patch(`/api/supplier/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supplier', 'my-orders'] })
      toast.success('Order status updated')
    },
    onError: () => toast.error('Failed to update order status'),
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-bold text-ink">Order Management</p>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All Orders</option>
          <option value="pending">New</option>
          <option value="confirmed">Confirmed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[280px_1fr]">
        <div className="rounded-base border border-border bg-white">
          {isLoading ? (
            <p className="p-3 text-base text-muted">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="p-3 text-base text-muted">No orders found.</p>
          ) : (
            orders.map((o) => {
              const badge = STATUS_BADGE[o.status]
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOrder(o.id)}
                  className={`flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left hover:bg-surface2 ${
                    selected?.id === o.id ? 'bg-ac-green-light' : ''
                  }`}
                >
                  <div>
                    <div className="text-base font-semibold text-ink">#{o.id.slice(0, 8)}</div>
                    <div className="text-sm text-muted">{formatKES(Number(o.totalPriceKes))}</div>
                  </div>
                  <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
                </button>
              )
            })
          )}
        </div>

        <div>
          {!selected ? (
            <div className="rounded-base border border-border bg-white p-4 text-base text-muted">
              Select an order to view details.
            </div>
          ) : (
            <div className="rounded-base border border-gold bg-white">
              <div className="flex items-center justify-between rounded-t-base bg-gold-dark px-4 py-3">
                <span className="text-md font-semibold text-ink">
                  Order #{selected.id.slice(0, 8)} <StatusBadge variant={STATUS_BADGE[selected.status].variant}>{STATUS_BADGE[selected.status].label}</StatusBadge>
                </span>
                <span className="text-sm text-muted">{new Date(selected.createdAt).toLocaleString()}</span>
              </div>

              <div className="px-4 py-3.5">
                <table className="mb-3 w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="border-b border-border py-1.5 pr-3 text-sm font-semibold uppercase text-muted">Product</th>
                      <th className="border-b border-border py-1.5 pr-3 text-sm font-semibold uppercase text-muted">Qty</th>
                      <th className="border-b border-border py-1.5 pr-3 text-sm font-semibold uppercase text-muted">Unit Price</th>
                      <th className="border-b border-border py-1.5 pr-3 text-sm font-semibold uppercase text-muted">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {/* TODO(real-data): no join to SupplierProduct.name from the order record. */}
                      <td className="py-1.5 pr-3 text-base text-ink">{selected.productId.slice(0, 8)}…</td>
                      <td className="py-1.5 pr-3 text-base text-ink">{selected.quantityUnits}</td>
                      <td className="py-1.5 pr-3 text-base text-ink">{formatKES(Number(selected.unitPriceKes))}</td>
                      <td className="py-1.5 pr-3 text-base font-semibold text-ac-green">
                        {formatKES(Number(selected.totalPriceKes))}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-base">
                    {/* TODO(real-data): no payment/M-Pesa reference field exists on Order yet. */}
                    <span>Payment: <span className="text-muted">—</span></span>
                    <span>Delivery: {selected.deliveryAddress}</span>
                  </div>
                  <span className="text-lg font-bold text-ink">
                    Order Total: {formatKES(Number(selected.totalPriceKes))}
                  </span>
                </div>

                {selected.notes && (
                  <div className="mb-3 text-base text-ink2">Notes: {selected.notes}</div>
                )}

                <div className="mb-3.5">
                  <WizardBar
                    steps={STEPS}
                    currentStep={STATUS_ORDER.indexOf(selected.status) + 1}
                  />
                </div>

                {NEXT_STATUS[selected.status] ? (
                  <button
                    type="button"
                    disabled={advanceMutation.isPending}
                    onClick={() =>
                      advanceMutation.mutate({ orderId: selected.id, status: NEXT_STATUS[selected.status]! })
                    }
                    className="w-full rounded-md bg-ac-green px-3 py-2.5 text-center text-base font-semibold text-white disabled:opacity-50"
                  >
                    {NEXT_ACTION_LABEL[selected.status]}
                  </button>
                ) : (
                  <AlertBox variant="green">This order has been delivered.</AlertBox>
                )}

                <div className="mt-2.5">
                  <AlertBox variant="green">
                    Farmer will receive SMS at each stage automatically. Final SMS asks for a 5-star rating.
                  </AlertBox>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
