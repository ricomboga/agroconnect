'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useInfiniteQuery } from '@tanstack/react-query'
import { SlidersHorizontal, Package, MapPin, Calendar, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Listing {
  id: string
  crop: string
  variety: string | null
  quantityKg: number
  qualityGrade: 'A' | 'B' | 'C' | 'reject'
  askingPriceKes: number
  locationCounty: string
  availableFrom: string
  availableUntil: string
  createdAt: string
}

interface ListingsPage {
  data: Listing[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

const CROPS = [
  'Avocado', 'Beans', 'Cabbage', 'Cassava', 'Coffee',
  'Kale', 'Maize', 'Onions', 'Potatoes', 'Sorghum',
  'Sweet Potato', 'Tea', 'Tomatoes', 'Wheat',
]

const GRADES = ['A', 'B', 'C']

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

function gradeBadgeVariant(
  grade: string,
): 'success' | 'warning' | 'secondary' {
  if (grade === 'A') return 'success'
  if (grade === 'B') return 'warning'
  return 'secondary'
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {listing.crop}
                {listing.variety ? ` · ${listing.variety}` : ''}
              </p>
              <p className="text-2xl font-extrabold text-green-700">
                KES {listing.askingPriceKes.toLocaleString()}
                <span className="text-sm font-normal text-gray-500">/kg</span>
              </p>
            </div>
            <Badge variant={gradeBadgeVariant(listing.qualityGrade)}>
              Grade {listing.qualityGrade}
            </Badge>
          </div>
          <div className="mt-4 space-y-1.5 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              {listing.quantityKg.toLocaleString()} kg available
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {listing.locationCounty}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              From{' '}
              {new Date(listing.availableFrom).toLocaleDateString('en-KE', {
                dateStyle: 'medium',
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ProduceListingsPage() {
  const [crop, setCrop] = useState('')
  const [county, setCounty] = useState('')
  const [grade, setGrade] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const filters = { crop, county, grade, dateFrom, dateTo }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['market', 'listings', filters],
      queryFn: async ({ pageParam }) => {
        const params: Record<string, string | number> = {
          page: pageParam as number,
          page_size: 20,
        }
        if (crop) params.crop = crop
        if (county) params.county = county
        if (grade) params.quality_grade = grade
        if (dateFrom) params.available_from = dateFrom
        if (dateTo) params.available_until = dateTo

        const res = await api.get<ListingsPage>('/api/v1/market/listings', { params })
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

  const listings = data?.pages.flatMap((p) => p.data) ?? []

  const resetFilters = () => {
    setCrop('')
    setCounty('')
    setGrade('')
    setDateFrom('')
    setDateTo('')
  }

  const activeFilterCount =
    (crop ? 1 : 0) + (county ? 1 : 0) + (grade ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fresh Produce</h1>
          <p className="text-sm text-gray-500">Browse listings from farmers across Kenya</p>
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

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Crop Type
            </legend>
            <div className="space-y-1.5">
              {CROPS.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    name="crop-filter"
                    checked={crop === c}
                    onChange={() => setCrop(crop === c ? '' : c)}
                    className="h-3.5 w-3.5 rounded-full border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="county-filter"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              County
            </label>
            <select
              id="county-filter"
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

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Quality Grade
            </p>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(grade === g ? '' : g)}
                  className={`flex-1 rounded-md border py-1 text-sm font-medium transition-colors ${
                    grade === g
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Available Date Range
            </p>
            <label htmlFor="date-from" className="mb-0.5 block text-xs text-gray-500">
              From
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <label htmlFor="date-to" className="mb-0.5 block text-xs text-gray-500">
              To
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </aside>

        {/* Listings grid */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Package className="h-14 w-14 text-gray-300" />
              <p className="mt-3 font-medium text-gray-600">No listings found</p>
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
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
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
