'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, Leaf, Activity, CreditCard, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AdminSummary {
  total_farmers: number
  total_farms: number
  diagnoses_this_month: number
  loans_disbursed_kes: number
  active_market_listings: number
}

interface ApiWrapper {
  data: AdminSummary
}

interface CardConfig {
  key: keyof AdminSummary
  label: string
  Icon: LucideIcon
  format: (v: number) => string
  color: string
}

function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

const CARDS: CardConfig[] = [
  {
    key: 'total_farmers',
    label: 'Total Farmers',
    Icon: Users,
    format: (v) => v.toLocaleString(),
    color: 'text-blue-500',
  },
  {
    key: 'total_farms',
    label: 'Total Farms',
    Icon: Leaf,
    format: (v) => v.toLocaleString(),
    color: 'text-green-500',
  },
  {
    key: 'diagnoses_this_month',
    label: 'Diagnoses This Month',
    Icon: Activity,
    format: (v) => v.toLocaleString(),
    color: 'text-purple-500',
  },
  {
    key: 'loans_disbursed_kes',
    label: 'Loans Disbursed',
    Icon: CreditCard,
    format: formatKES,
    color: 'text-orange-500',
  },
  {
    key: 'active_market_listings',
    label: 'Active Listings',
    Icon: ShoppingBag,
    format: (v) => v.toLocaleString(),
    color: 'text-teal-500',
  },
]

export function SummaryCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get<ApiWrapper>('/api/v1/admin/analytics/summary')
      return res.data.data
    },
    refetchInterval: 60_000,
  })

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {CARDS.map(({ key, label, Icon, format, color }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {data?.[key] !== undefined ? format(data[key]) : '—'}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
