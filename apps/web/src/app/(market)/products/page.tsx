'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Package, MapPin, SlidersHorizontal, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Product {
  id: string
  name: string
  category: 'seed' | 'fertiliser' | 'pesticide' | 'herbicide' | 'equipment' | 'veterinary' | 'other'
  brand: string | null
  description: string
  unit: string
  pricePerUnitKes: number
  stockQuantity: number
  countyAvailability: string[]
}

interface ProductsPage {
  data: Product[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

const CATEGORIES: { label: string; value: Product['category'] }[] = [
  { label: 'Seeds', value: 'seed' },
  { label: 'Fertilisers', value: 'fertiliser' },
  { label: 'Pesticides', value: 'pesticide' },
  { label: 'Herbicides', value: 'herbicide' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Veterinary', value: 'veterinary' },
  { label: 'Other', value: 'other' },
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
  const inStock = product.stockQuantity > 0
  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category

  return (
    <Link href={`/products/${product.id}`}>
      <Card className={`flex h-full cursor-pointer flex-col transition-shadow hover:shadow-md ${!inStock ? 'opacity-60' : ''}`}>
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="flex-1">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900">{product.name}</p>
              <Badge variant={inStock ? 'success' : 'secondary'} className="flex-shrink-0">
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>
            {product.description && (
              <p className="mb-3 line-clamp-2 text-xs text-gray-500">{product.description}</p>
            )}
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Package className="h-3 w-3 text-gray-400" />
                {categoryLabel}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-gray-400" />
                {product.countyAvailability.join(', ')}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-green-700">
              KES {product.pricePerUnitKes.toLocaleString()}
              <span className="text-xs font-normal text-gray-500">/{product.unit}</span>
            </p>
            <span className="flex items-center text-sm font-medium text-green-700">
              View Details
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ProductsPage() {
  const [category, setCategory] = useState<Product['category'] | ''>('')
  const [county, setCounty] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const filters = { category, county }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['market', 'products', filters],
      queryFn: async ({ pageParam }) => {
        const params: Record<string, string | number> = {
          page: pageParam as number,
          page_size: 20,
        }
        if (category) params.category = category
        if (county) params.county = county

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

  // stockQuantity isn't a backend filter, so "in stock only" is applied client-side
  const allProducts = data?.pages.flatMap((p) => p.data) ?? []
  const products = inStockOnly ? allProducts.filter((p) => p.stockQuantity > 0) : allProducts

  const resetFilters = () => {
    setCategory('')
    setCounty('')
    setInStockOnly(false)
  }

  const activeFilterCount = (category ? 1 : 0) + (county ? 1 : 0) + (inStockOnly ? 1 : 0)

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
                  key={cat.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    name="category-filter"
                    checked={category === cat.value}
                    onChange={() => setCategory(category === cat.value ? '' : cat.value)}
                    className="h-3.5 w-3.5 rounded-full border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  {cat.label}
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
