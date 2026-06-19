import type { Metadata } from 'next'
import Link from 'next/link'
import { Leaf } from 'lucide-react'
import { CartNav } from './_components/CartNav'
import { CartDrawer } from './_components/CartDrawer'

export const metadata: Metadata = {
  title: 'AgroConnect Market',
  description: 'Buy fresh produce and farm supplies directly from Kenyan farmers',
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-green-700">
            <Leaf className="h-5 w-5" />
            AgroConnect
          </Link>
          <nav className="flex flex-1 gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="transition-colors hover:text-green-700">
              Produce
            </Link>
            <Link href="/products" className="transition-colors hover:text-green-700">
              Supplies
            </Link>
          </nav>
          <CartNav />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <CartDrawer />
    </div>
  )
}
