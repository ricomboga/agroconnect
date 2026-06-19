'use client'

import { useState } from 'react'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

interface OrderPayload {
  items: Array<{ product_id: string; quantity: number }>
}

interface ApiErrorBody {
  error: { message: string }
}

export function CartDrawer() {
  const items = useCartStore((s) => s.items)
  const isOpen = useCartStore((s) => s.isOpen)
  const closeCart = useCartStore((s) => s.closeCart)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0)

  const handleCheckout = async () => {
    setIsSubmitting(true)
    try {
      const payload: OrderPayload = {
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      }
      await api.post('/api/v1/market/orders', payload)
      clearCart()
      closeCart()
      toast.success('Order placed successfully!')
    } catch (err) {
      const error = err as AxiosError<ApiErrorBody>
      toast.error(error.response?.data?.error?.message ?? 'Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <h2 className="font-semibold text-gray-900">
            Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h2>
          <Button variant="ghost" size="icon" onClick={closeCart} aria-label="Close cart">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      KES {item.price.toLocaleString()} / {item.unit}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 hover:bg-gray-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 hover:bg-gray-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      KES {(item.price * item.quantity).toLocaleString()}
                    </p>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-200 px-4 py-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-medium text-gray-700">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  KES {total.toLocaleString()}
                </span>
              </div>
              <Button
                className="w-full"
                onClick={() => void handleCheckout()}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Placing order…' : 'Place Order'}
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
