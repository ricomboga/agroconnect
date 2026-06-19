'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Package, Calendar, TrendingUp, Phone, X, ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ListingDetail {
  id: string
  crop: string
  quantity_kg: number
  grade: string
  price_per_kg: number
  county: string
  available_from: string
  created_at: string
  description?: string
}

interface PricePoint {
  date: string
  price_per_kg: number
}

interface ListingResponse {
  data: ListingDetail
}

interface PricesResponse {
  data: PricePoint[]
}

interface InquireResponse {
  data: { farmer_phone: string }
}

interface ApiErrorBody {
  error: { message: string }
}

// ── SVG price chart ──────────────────────────────────────────────────────────

function PriceHistoryChart({ points }: { points: PricePoint[] }) {
  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        Not enough data for price history
      </p>
    )
  }

  const W = 600
  const H = 180
  const PAD = { top: 16, right: 16, bottom: 28, left: 52 }

  const prices = points.map((p) => p.price_per_kg)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const range = maxP - minP || 1

  const xScale = (i: number) =>
    PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right)
  const yScale = (p: number) =>
    PAD.top + (1 - (p - minP) / range) * (H - PAD.top - PAD.bottom)

  const polyPoints = points
    .map((p, i) => `${xScale(i)},${yScale(p.price_per_kg)}`)
    .join(' ')

  const areaPoints = [
    `${xScale(0)},${H - PAD.bottom}`,
    ...points.map((p, i) => `${xScale(i)},${yScale(p.price_per_kg)}`),
    `${xScale(points.length - 1)},${H - PAD.bottom}`,
  ].join(' ')

  const currentPrice = prices[prices.length - 1] ?? 0
  const firstPrice = prices[0] ?? 0
  const changeKes = currentPrice - firstPrice
  const changePct = firstPrice > 0 ? ((changeKes / firstPrice) * 100).toFixed(1) : '0.0'

  const formatAxisDate = (d: string) =>
    new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-900">
          KES {currentPrice.toFixed(2)}
        </span>
        <span
          className={`text-sm font-medium ${
            changeKes >= 0 ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {changeKes >= 0 ? '+' : ''}
          {changeKes.toFixed(2)} ({changePct}%)
        </span>
        <span className="text-xs text-gray-400">vs 90 days ago</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="90-day commodity price chart"
      >
        <defs>
          <linearGradient id="price-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines at 0 %, 50 %, 100 % */}
        {([0, 0.5, 1] as const).map((t) => {
          const y = PAD.top + t * (H - PAD.top - PAD.bottom)
          const label = (maxP - t * range).toFixed(0)
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                {label}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#price-area-fill)" />

        {/* Price line */}
        <polyline
          points={polyPoints}
          fill="none"
          stroke="#16a34a"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X-axis start / end labels */}
        {points[0] && (
          <text
            x={xScale(0)}
            y={H - 4}
            textAnchor="middle"
            fontSize={10}
            fill="#9ca3af"
          >
            {formatAxisDate(points[0].date)}
          </text>
        )}
        {points[points.length - 1] && (
          <text
            x={xScale(points.length - 1)}
            y={H - 4}
            textAnchor="middle"
            fontSize={10}
            fill="#9ca3af"
          >
            {formatAxisDate(points[points.length - 1]!.date)}
          </text>
        )}
      </svg>
    </div>
  )
}

// ── Contact modal ────────────────────────────────────────────────────────────

function ContactModal({
  listingId,
  onClose,
}: {
  listingId: string
  onClose: () => void
}) {
  const [phone, setPhone] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleReveal = async () => {
    setIsLoading(true)
    try {
      const res = await api.post<InquireResponse>(
        `/api/v1/market/listings/${listingId}/inquire`,
      )
      setPhone(res.data.data.farmer_phone)
    } catch (err) {
      const error = err as AxiosError<ApiErrorBody>
      toast.error(error.response?.data?.error?.message ?? 'Failed to get contact details')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="contact-modal-title" className="font-semibold text-gray-900">
            Contact Farmer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {phone ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-green-50 p-4">
            <Phone className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Farmer&apos;s phone</p>
              <a
                href={`tel:${phone}`}
                className="text-lg font-bold text-green-700 hover:underline"
              >
                {phone}
              </a>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-gray-600">
              Your contact details will be shared with the farmer so they can arrange
              delivery or collection.
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => void handleReveal()}
              disabled={isLoading}
            >
              {isLoading ? 'Loading…' : 'Reveal Contact Number'}
            </Button>
          </>
        )}
      </div>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function gradeBadgeVariant(grade: string): 'success' | 'warning' | 'secondary' {
  if (grade === 'A') return 'success'
  if (grade === 'B') return 'warning'
  return 'secondary'
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [modalOpen, setModalOpen] = useState(false)

  const {
    data: listing,
    isLoading: listingLoading,
    isError,
  } = useQuery({
    queryKey: ['market', 'listing', id],
    queryFn: async () => {
      const res = await api.get<ListingResponse>(`/api/v1/market/listings/${id}`)
      return res.data.data
    },
    enabled: Boolean(id),
  })

  const { data: pricePoints } = useQuery({
    queryKey: ['market', 'prices', listing?.crop],
    queryFn: async () => {
      const res = await api.get<PricesResponse>('/api/v1/market/prices', {
        params: { crop: listing!.crop, days: 90 },
      })
      return res.data.data
    },
    enabled: Boolean(listing?.crop),
  })

  if (listingLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !listing) {
    return (
      <div className="py-20 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-gray-500">Listing not found.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-green-600 hover:underline">
          Back to listings
        </Link>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Price per kg',
      value: `KES ${listing.price_per_kg.toLocaleString()}`,
      Icon: TrendingUp,
    },
    {
      label: 'Quantity',
      value: `${listing.quantity_kg.toLocaleString()} kg`,
      Icon: Package,
    },
    { label: 'County', value: listing.county, Icon: MapPin },
    {
      label: 'Available from',
      value: new Date(listing.available_from).toLocaleDateString('en-KE', {
        dateStyle: 'medium',
      }),
      Icon: Calendar,
    },
  ]

  return (
    <div className="max-w-3xl">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{listing.crop}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={gradeBadgeVariant(listing.grade)}>
              Grade {listing.grade}
            </Badge>
            <span className="text-xs text-gray-400">
              Listed{' '}
              {new Date(listing.created_at).toLocaleDateString('en-KE', {
                dateStyle: 'medium',
              })}
            </span>
          </div>
        </div>
        <Button size="lg" onClick={() => setModalOpen(true)}>
          <Phone className="mr-2 h-4 w-4" />
          Contact Farmer
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map(({ label, value, Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="mt-1 font-semibold text-gray-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {listing.description && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <p className="text-sm text-gray-700">{listing.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-green-600" />
            {listing.crop} — 90-Day Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pricePoints ? (
            <PriceHistoryChart points={pricePoints} />
          ) : (
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <ContactModal listingId={listing.id} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
