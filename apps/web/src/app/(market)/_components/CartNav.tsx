'use client'

import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'

export function CartNav() {
  const items = useCartStore((s) => s.items)
  const openCart = useCartStore((s) => s.openCart)
  const count = items.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      onClick={openCart}
      aria-label={`Open cart, ${count} item${count !== 1 ? 's' : ''}`}
    >
      <ShoppingCart className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  )
}
