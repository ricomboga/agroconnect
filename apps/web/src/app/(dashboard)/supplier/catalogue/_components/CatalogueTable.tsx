'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DataTable, StatusBadge, TextInput, Select } from '@agroconnect/web-ui'
import type { DataTableColumn, StatusBadgeVariant } from '@agroconnect/web-ui'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface SupplierProduct {
  id: string
  supplierId: string
  name: string
  category: 'seed' | 'fertiliser' | 'pesticide' | 'herbicide' | 'equipment' | 'veterinary' | 'other'
  brand?: string
  pricePerUnitKes: string
  stockQuantity: string
  unit: string
  isActive: boolean
}

interface ProductsResponse {
  data: SupplierProduct[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

const CATEGORY_BADGE: Record<SupplierProduct['category'], { variant: StatusBadgeVariant; label: string }> = {
  fertiliser: { variant: 'green', label: '🌾 Fertiliser' },
  seed: { variant: 'green', label: '🌱 Seeds' },
  pesticide: { variant: 'amber', label: '🌿 Pesticide' },
  herbicide: { variant: 'amber', label: '🌿 Herbicide' },
  veterinary: { variant: 'teal', label: '💊 Animal Drug' },
  equipment: { variant: 'purple', label: '🔧 Equipment' },
  other: { variant: 'blue', label: '📦 Other' },
}

function formatKES(n: number): string {
  return `KES ${n.toLocaleString()}`
}

// Judgment call: no fixed low-stock threshold is returned per-product by the
// backend (only the supplier summary endpoint takes a threshold param), so the
// catalogue table's Stock/Status badges use these local cutoffs purely for display.
function stockBadge(stock: number): { variant: StatusBadgeVariant; label: string } {
  if (stock <= 0) return { variant: 'red', label: 'Out of Stock' }
  if (stock <= 10) return { variant: 'red', label: 'Low Stock' }
  if (stock <= 20) return { variant: 'amber', label: 'Running Low' }
  return { variant: 'green', label: 'In Stock' }
}

export function CatalogueTable() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['supplier', 'products'],
    queryFn: async () => {
      const res = await api.get<ProductsResponse>('/api/supplier/products', {
        params: { page: 1, page_size: 100 },
      })
      return res.data
    },
  })

  // NOTE(real-data): GET /api/v1/market/products is the public marketplace
  // browse endpoint (all suppliers' active products) — there is no owner-scoped
  // "my products" list endpoint in the current contract. We filter client-side
  // by supplierId === the logged-in supplier's own id to approximate "My Catalogue".
  const myProducts = (data?.data ?? []).filter((p) => !user?.id || p.supplierId === user.id)

  const filtered = myProducts.filter((p) => {
    if (category && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const columns: DataTableColumn<SupplierProduct>[] = [
    { key: 'name', header: 'Product', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    {
      key: 'category',
      header: 'Category',
      render: (row) => {
        const badge = CATEGORY_BADGE[row.category]
        return <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
      },
    },
    {
      key: 'pricePerUnitKes',
      header: 'Unit Price',
      render: (row) => <span>{formatKES(Number(row.pricePerUnitKes))}</span>,
    },
    {
      key: 'stockQuantity',
      header: 'Stock',
      render: (row) => <span>{row.stockQuantity} {row.unit}</span>,
    },
    {
      key: 'salesPerMonth',
      header: 'Sales/Mo',
      // TODO(real-data): no sales-aggregate model exists yet.
      render: () => <span className="text-muted">—</span>,
    },
    {
      key: 'aiLinked',
      header: 'AI Linked',
      // TODO(real-data): no compatibleCrops/linkedDiseases columns exist on SupplierProduct yet.
      render: () => <span className="text-muted">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const badge = stockBadge(Number(row.stockQuantity))
        return <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => router.push(`/supplier/catalogue/new?id=${row.id}`)}
            className="rounded-md bg-ac-green px-3 py-1 text-sm font-semibold text-white"
          >
            Edit
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Product Catalogue</p>
          <p className="text-base text-muted">{myProducts.length} active products across your catalogue</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/supplier/catalogue/new')}
          className="rounded-md bg-ac-green px-3 py-1.5 text-base font-semibold text-white"
        >
          + Add Product
        </button>
      </div>

      <div className="mb-3.5 flex items-center gap-2">
        <div className="flex-1">
          <TextInput placeholder="🔍 Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
          <option value="">All Categories</option>
          <option value="fertiliser">Fertiliser</option>
          <option value="pesticide">Pesticide</option>
          <option value="herbicide">Herbicide</option>
          <option value="seed">Seed</option>
          <option value="veterinary">Animal Drug</option>
          <option value="equipment">Equipment</option>
          <option value="other">Other</option>
        </Select>
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-2">
        {isLoading ? (
          <p className="py-6 text-center text-base text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-base text-muted">No products found.</p>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </div>
    </div>
  )
}
