'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormSection, FieldGroup, Field, TextInput, Textarea, StatusBadge, ProgressBar } from '@agroconnect/web-ui'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'

// TODO(real-data): no Review model exists in market-service yet — the
// reviews list and rating summary below remain sample data pending a
// backend model. The business profile fields above them are now real,
// live data (see /suppliers/me/profile).

interface MockReview {
  reviewerName: string
  stars: number
  comment: string
  date: string
}

const MOCK_REVIEWS: MockReview[] = [
  {
    reviewerName: 'Jane Wanjiru',
    stars: 5,
    comment: 'Fast delivery and the Mancozeb was exactly what my maize needed. Will buy again.',
    date: '2025-06-02',
  },
  {
    reviewerName: 'Peter Kipchoge',
    stars: 5,
    comment: 'Good prices on fertiliser compared to other agrovets in Nakuru.',
    date: '2025-05-20',
  },
  {
    reviewerName: 'Mary Njeri',
    stars: 4,
    comment: 'Vaccine was in stock when everyone else was out. A bit slow on delivery though.',
    date: '2025-05-11',
  },
]

const RATING_DISTRIBUTION = [
  { stars: 5, count: 108 },
  { stars: 4, count: 28 },
  { stars: 3, count: 4 },
  { stars: 2, count: 1 },
  { stars: 1, count: 1 },
]

const TOTAL_REVIEWS = RATING_DISTRIBUTION.reduce((sum, r) => sum + r.count, 0)

function Stars({ count }: { count: number }) {
  return (
    <span className="text-ac-gold" aria-label={`${count} out of 5 stars`}>
      {'★'.repeat(count)}
      {'☆'.repeat(5 - count)}
    </span>
  )
}

interface SupplierProfile {
  businessName: string
  businessRegNumber: string | null
  description: string | null
  county: string
  subCounty: string | null
  address: string | null
  deliveryRadiusKm: string | null
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response
    if (resp?.data?.message) return resp.data.message
  }
  return fallback
}

export function ProfileReviews() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['supplier', 'profile'],
    queryFn: async () => {
      const res = await api.get<{ data: SupplierProfile }>('/api/supplier/suppliers/me/profile')
      return res.data.data
    },
  })

  const [description, setDescription] = useState('')
  const [deliveryRangeKm, setDeliveryRangeKm] = useState('')
  const [address, setAddress] = useState('')
  const [subCounty, setSubCounty] = useState('')

  useEffect(() => {
    if (!profile) return
    setDescription(profile.description ?? '')
    setDeliveryRangeKm(profile.deliveryRadiusKm ?? '')
    setAddress(profile.address ?? '')
    setSubCounty(profile.subCounty ?? '')
  }, [profile])

  const mutation = useMutation({
    mutationFn: () =>
      api.patch('/api/supplier/suppliers/me/profile', {
        description: description || undefined,
        deliveryRadiusKm: deliveryRangeKm || undefined,
        address: address || undefined,
        subCounty: subCounty || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supplier', 'profile'] })
      toast.success('Business profile updated')
    },
    onError: (err) => toast.error(errorMessage(err, 'Failed to update business profile')),
  })

  const businessName = profile?.businessName ?? (isLoading ? 'Loading…' : 'Business name not set')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Public Profile</p>
          <p className="text-base text-muted">How buyers see {businessName} on the market</p>
        </div>
        <StatusBadge variant="green">✓ Verified Supplier</StatusBadge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-base border border-border bg-white p-4">
          <FormSection title="Business Profile">
            <FieldGroup cols={2}>
              <Field label="Business Name" hint="Set by admin at onboarding">
                <TextInput value={businessName} readOnly />
              </Field>
              <Field label="Business Registration No." hint="Set by admin at onboarding">
                <TextInput value={profile?.businessRegNumber ?? '—'} readOnly />
              </Field>
            </FieldGroup>

            <Field label="Business Description">
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            <FieldGroup cols={3}>
              <Field label="Delivery Range (km)">
                <TextInput value={deliveryRangeKm} onChange={(e) => setDeliveryRangeKm(e.target.value)} />
              </Field>
              <Field label="County" hint="Set by admin at onboarding">
                <TextInput value={profile?.county ?? '—'} readOnly />
              </Field>
              <Field label="Sub-county">
                <TextInput value={subCounty} onChange={(e) => setSubCounty(e.target.value)} />
              </Field>
            </FieldGroup>

            <Field label="Physical Address">
              <TextInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Kenyatta Ave, Nakuru Town" />
            </Field>

            <div>
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || isLoading}
                className="rounded-md bg-ac-green px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </FormSection>

          <FormSection title="Customer Reviews">
            <div className="flex flex-col gap-3">
              {MOCK_REVIEWS.map((review) => (
                <div key={`${review.reviewerName}-${review.date}`} className="rounded-base border border-border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-base font-semibold text-ink">{review.reviewerName}</span>
                    <Stars count={review.stars} />
                  </div>
                  <p className="mb-1 text-base text-ink2">{review.comment}</p>
                  <span className="text-xs text-muted">{new Date(review.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </FormSection>
        </div>

        <div className="rounded-base border border-border bg-white p-4">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-ac-green">Review Summary</p>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-ink">4.8</span>
            <Stars count={5} />
          </div>
          <p className="mb-4 text-sm text-muted">{TOTAL_REVIEWS} total reviews</p>

          <div className="flex flex-col gap-2">
            {RATING_DISTRIBUTION.map((row) => (
              <div key={row.stars} className="flex items-center gap-2">
                <span className="w-10 text-sm text-ink2">{row.stars}★</span>
                <div className="flex-1">
                  <ProgressBar value={(row.count / TOTAL_REVIEWS) * 100} color="green" />
                </div>
                <span className="w-6 text-right text-sm text-muted">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Signed in as {user?.fullName ?? 'Supplier'} · reviews above are sample data pending a backend Review model.
      </p>
    </div>
  )
}
