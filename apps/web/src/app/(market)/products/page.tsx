'use client'

import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Package, MapPin, SlidersHorizontal, ShoppingCart, Check } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cartStore'

interface Product {
  id: string
  name: string
  category: string
  description: string
  price: number
  unit: string
  supplier_name: string
  county: string
  in_stock: boolean
}

interface ProductsPage {
  data: Product[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

const CATEGORIES = [
  'Animal Feed',
  'Fertilizers',
  'Herbicides',
  'Irrigation',
  'Pesticides',
  'Seeds',
  'Tools & Equipment',
  'Veterinary',
]

const COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale',
  'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi',
  'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya',
  'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana',
  'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const items = useCartStore((s) => s.items)
  const inCart = items.some((i) => i.productId === product.id)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
    })
    openCart()
    toast.success(`${product.name} added to cart`)
  }

  return (
    <Card className={`flex flex-col ${!product.in_stock ? 'opacity-60' : ''}`}>
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900">{product.name}</p>
            <Badge variant={product.in_stock ? 'success' : 'secondary'} className="flex-shrink-0">
              {product.in_stock ? 'In Stock' : 'Out of Stock'}
            </Badge>
          </div>
          {product.description && (
            <p className="mb-3 line-clamp-2 text-xs text-gray-500">{product.description}</p>
          )}
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3 text-gray-400" />
              {product.category}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gray-400" />
              {product.county} · {product.supplier_name}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-lg font-bold text-green-700">
            KES {product.price.toLocaleString()}
            <span className="text-xs font-normal text-gray-500">/{product.unit}</span>
          </p>
          <Button
            size="sm"
            variant={inCart ? 'secondary' : 'default'}
            disabled={!product.in_stock}
            onClick={handleAddToCart}
          >
            {inCart ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProductsPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [county, setCounty] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const filters = { selectedCategories, county, inStockOnly }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['market', 'products', filters],
      queryFn: async ({ pageParam }) => {
        const params: Record<string, string | number | boolean> = {
          page: pageParam as number,
          page_size: 20,
        }
        if (selectedCategories.length > 0) params.category = selectedCategories.join(',')
        if (county) params.county = county
        if (inStockOnly) params.in_stock = true

        const res = await api.get<ProductsPage>('/api/v1/market/products', { params })
        return res.data
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.meta.page < lastPage.meta.total_pages
          ? lastPage.meta.page + 1
          : undefined,
    })

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const products = data?.pages.flatMap((p) => p.data) ?? []

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )

  const resetFilters = () => {
    setSelectedCategories([])
    setCounty('')
    setInStockOnly(false)
  }

  const activeFilterCount =
    selectedCategories.length + (county ? 1 : 0) + (inStockOnly ? 1 : 0)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Supplies</h1>
          <p className="text-sm text-gray-500">Seeds, fertilizers, equipment and more</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen((o) => !o)}
          className="lg:hidden"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside
          className={`w-56 flex-shrink-0 space-y-6 ${sidebarOpen ? 'block' : 'hidden'} lg:block`}
        >
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-green-600 hover:underline"
            >
              Clear all filters
            </button>
          )}

          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              In stock only
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Category
            </legend>
            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  {cat}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="products-county"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              County
            </label>
            <select
              id="products-county"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All counties</option>
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* Products grid */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Package className="h-14 w-14 text-gray-300" />
              <p className="mt-3 font-medium text-gray-600">No products found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-4 text-sm font-medium text-green-600 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div ref={loaderRef} className="mt-8 flex justify-center pb-4" aria-hidden="true">
            {isFetchingNextPage && (
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
