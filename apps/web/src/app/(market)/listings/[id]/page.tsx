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
  variety: string | null
  quantityKg: number
  qualityGrade: 'A' | 'B' | 'C' | 'reject'
  askingPriceKes: number
  locationCounty: string
  locationDescription: string | null
  availableFrom: string
  createdAt: string
}

interface CommodityPrice {
  id: string
  crop: string
  priceKes: number
  unit: string
  updatedAt: string
}

// From predict-service, not market-service — a forward-looking forecast,
// not a stored price history. Only covers 10 staple crops (maize, beans,
// wheat, rice, potatoes, tomatoes, sorghum, millet, cassava, groundnuts);
// 404s for anything else.
interface PricePrediction {
  crop: string
  current_price_kes: number
  predicted_price_kes: number
  days_ahead: number
  confidence_low: number
  confidence_high: number
  trend: 'rising' | 'falling' | 'stable'
}

interface ListingResponse {
  data: ListingDetail
}

interface PricesResponse {
  data: CommodityPrice[]
}

interface ApiErrorBody {
  error: { message: string }
}

// ── Current market price (no historical series exists server-side —
// GET /market/prices returns one current snapshot per crop, not a time
// series, so this shows "today's reference price" rather than a chart) ──────

function CurrentPriceCard({ price }: { price: CommodityPrice | undefined }) {
  if (!price) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">
        No reference price available for this crop
      </p>
    )
  }
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-gray-900">
        KES {price.priceKes.toFixed(2)}
      </span>
      <span className="text-sm text-gray-500">
        /{price.unit} reference price · updated{' '}
        {new Date(price.updatedAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
      </span>
    </div>
  )
}

const TREND_LABEL: Record<PricePrediction['trend'], string> = {
  rising: 'Rising',
  falling: 'Falling',
  stable: 'Stable',
}
const TREND_COLOR: Record<PricePrediction['trend'], string> = {
  rising: 'text-green-600',
  falling: 'text-red-500',
  stable: 'text-gray-500',
}

function PriceForecastCard({ forecast }: { forecast: PricePrediction | undefined }) {
  if (!forecast) return null
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {forecast.days_ahead}-Day Forecast
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-gray-900">
          KES {forecast.predicted_price_kes.toFixed(2)}
        </span>
        <span className={`text-sm font-medium ${TREND_COLOR[forecast.trend]}`}>
          {TREND_LABEL[forecast.trend]}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">
        Range: KES {forecast.confidence_low.toFixed(2)} – {forecast.confidence_high.toFixed(2)}
      </p>
    </div>
  )
}

// ── Contact modal ────────────────────────────────────────────────────────────
// The inquire endpoint only accepts a message and notifies the farmer — it
// does not return a phone number, so this sends an inquiry rather than
// pretending to reveal contact details.

function ContactModal({
  listingId,
  onClose,
}: {
  listingId: string
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    setIsLoading(true)
    try {
      await api.post(`/api/v1/market/listings/${listingId}/inquire`, {
        message: message.trim(),
      })
      setSent(true)
    } catch (err) {
      const error = err as AxiosError<ApiErrorBody>
      toast.error(error.response?.data?.error?.message ?? 'Failed to send inquiry')
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

        {sent ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-green-50 p-4">
            <Phone className="h-5 w-5 flex-shrink-0 text-green-600" />
            <p className="text-sm text-green-800">
              Your inquiry has been sent. The farmer will reach out to arrange delivery or
              collection.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-gray-600">
              Send a message to the farmer — they&apos;ll be notified and can contact you back.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="e.g. I'm interested in buying 200kg, is it still available?"
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button
              className="mt-4 w-full"
              onClick={() => void handleSend()}
              disabled={isLoading || message.trim().length === 0}
            >
              {isLoading ? 'Sending…' : 'Send Inquiry'}
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

  const { data: prices } = useQuery({
    queryKey: ['market', 'prices'],
    queryFn: async () => {
      const res = await api.get<PricesResponse>('/api/v1/market/prices')
      return res.data.data
    },
  })
  const cropPrice = prices?.find(
    (p) => p.crop.toLowerCase() === listing?.crop.toLowerCase(),
  )

  const { data: forecast } = useQuery({
    queryKey: ['predict', 'prices', listing?.crop],
    queryFn: async () => {
      const res = await api.get<PricePrediction>('/api/v1/predict/prices', {
        params: { crop: listing!.crop.toLowerCase(), days_ahead: 30 },
      })
      return res.data
    },
    enabled: Boolean(listing?.crop),
    retry: false,
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
        <Link href="/market" className="mt-4 inline-block text-sm text-green-600 hover:underline">
          Back to listings
        </Link>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Price per kg',
      value: `KES ${listing.askingPriceKes.toLocaleString()}`,
      Icon: TrendingUp,
    },
    {
      label: 'Quantity',
      value: `${listing.quantityKg.toLocaleString()} kg`,
      Icon: Package,
    },
    { label: 'County', value: listing.locationCounty, Icon: MapPin },
    {
      label: 'Available from',
      value: new Date(listing.availableFrom).toLocaleDateString('en-KE', {
        dateStyle: 'medium',
      }),
      Icon: Calendar,
    },
  ]

  return (
    <div className="max-w-3xl">
      <Link
        href="/market"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {listing.crop}
            {listing.variety ? ` · ${listing.variety}` : ''}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={gradeBadgeVariant(listing.qualityGrade)}>
              Grade {listing.qualityGrade}
            </Badge>
            <span className="text-xs text-gray-400">
              Listed{' '}
              {new Date(listing.createdAt).toLocaleDateString('en-KE', {
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

      {listing.locationDescription && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <p className="text-sm text-gray-700">{listing.locationDescription}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-green-600" />
            {listing.crop} Market Price
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentPriceCard price={cropPrice} />
          <PriceForecastCard forecast={forecast} />
        </CardContent>
      </Card>

      {modalOpen && (
        <ContactModal listingId={listing.id} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
