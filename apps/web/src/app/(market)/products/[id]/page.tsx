'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Package, MapPin, Phone, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ProductDetail {
  id: string
  supplierId: string
  name: string
  category: 'seed' | 'fertiliser' | 'pesticide' | 'herbicide' | 'equipment' | 'veterinary' | 'other'
  brand: string | null
  description: string
  unit: string
  pricePerUnitKes: number
  stockQuantity: number
  countyAvailability: string[]
}

interface SupplierProfile {
  id: string
  businessName: string
  county: string
  phone: string
}

interface ApiErrorBody {
  error: { message: string }
}

const CATEGORY_LABELS: Record<ProductDetail['category'], string> = {
  seed: 'Seeds',
  fertiliser: 'Fertilisers',
  pesticide: 'Pesticides',
  herbicide: 'Herbicides',
  equipment: 'Equipment',
  veterinary: 'Veterinary',
  other: 'Other',
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [qty, setQty] = useState('1')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [orderSent, setOrderSent] = useState(false)

  const {
    data: product,
    isLoading: productLoading,
    isError,
  } = useQuery({
    queryKey: ['market', 'product', id],
    queryFn: async () => {
      const res = await api.get<{ data: ProductDetail }>(`/api/v1/market/products/${id}`)
      return res.data.data
    },
    enabled: Boolean(id),
  })

  const { data: supplier } = useQuery({
    queryKey: ['market', 'supplier-profile', 'by-user', product?.supplierId],
    queryFn: async () => {
      const res = await api.get<{ data: SupplierProfile[] }>('/api/v1/market/supplier-profiles', {
        params: { userId: product!.supplierId },
      })
      return res.data.data[0] ?? null
    },
    enabled: Boolean(product?.supplierId),
  })

  const orderMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/market/orders', {
        productId: id,
        quantityUnits: parseFloat(qty) || 0,
        deliveryAddress: deliveryAddress.trim(),
        notes: notes.trim() || undefined,
      })
    },
    onSuccess: () => setOrderSent(true),
    onError: (err) => {
      const error = err as AxiosError<ApiErrorBody>
      toast.error(error.response?.data?.error?.message ?? 'Failed to send order')
    },
  })

  const qtyNum = parseFloat(qty) || 0
  const isValid = qtyNum > 0 && deliveryAddress.trim().length > 0

  if (productLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="py-20 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-gray-500">Product not found.</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-green-600 hover:underline">
          Back to products
        </Link>
      </div>
    )
  }

  const inStock = product.stockQuantity > 0

  return (
    <div className="max-w-2xl">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{product.name}</h1>
          {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
        </div>
        <Badge variant={inStock ? 'success' : 'secondary'}>
          {inStock ? 'In Stock' : 'Out of Stock'}
        </Badge>
      </div>

      <p className="mb-6 text-2xl font-bold text-green-700">
        KES {product.pricePerUnitKes.toLocaleString()}
        <span className="text-sm font-normal text-gray-500">/{product.unit}</span>
      </p>

      <Card className="mb-6">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description
            </p>
            <p className="mt-1 text-sm text-gray-700">{product.description}</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              {CATEGORY_LABELS[product.category]}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {product.countyAvailability.join(', ')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier contact */}
      <Card className="mb-6 border-green-100 bg-green-50/50">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Supplier</p>
          {supplier ? (
            <>
              <p className="mt-1 font-semibold text-gray-900">{supplier.businessName}</p>
              <p className="text-sm text-gray-500">{supplier.county}</p>
              <a href={`tel:${supplier.phone}`}>
                <Button className="mt-3 w-full">
                  <Phone className="mr-2 h-4 w-4" />
                  Call {supplier.phone}
                </Button>
              </a>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Supplier contact unavailable</p>
          )}
        </CardContent>
      </Card>

      {/* Send order */}
      {orderSent ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-5 text-center text-sm font-medium text-green-800">
            Order sent! The supplier will contact you to arrange delivery and payment.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-semibold text-gray-900">Send Order Request</p>
            <p className="text-xs text-gray-500">
              No online payment — the supplier will call you to arrange delivery and payment.
            </p>

            <div>
              <label htmlFor="order-qty" className="mb-1 block text-xs font-medium text-gray-600">
                Quantity ({product.unit})
              </label>
              <input
                id="order-qty"
                type="number"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="order-address" className="mb-1 block text-xs font-medium text-gray-600">
                Delivery Address
              </label>
              <input
                id="order-address"
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="e.g. Kiambu Town, near the market"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="order-notes" className="mb-1 block text-xs font-medium text-gray-600">
                Notes (optional)
              </label>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything the supplier should know"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => orderMutation.mutate()}
              disabled={!isValid || orderMutation.isPending}
            >
              {orderMutation.isPending ? 'Sending…' : 'Send Order'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
