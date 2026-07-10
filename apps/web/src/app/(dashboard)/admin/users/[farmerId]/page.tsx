'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FarmerDetailView, farmTypeInfo } from './_components/FarmerDetailView'
import { LenderDetailView } from './_components/LenderDetailView'
import { SupplierDetailView } from './_components/SupplierDetailView'
import { GenericStaffDetailView } from './_components/GenericStaffDetailView'
import { ROLE_TO_TYPE } from '../new/_data/roleFormConfig'

interface AdminUser {
  id: string
  full_name: string
  phone: string
  email: string | null
  role: string
  county: string
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected'
  is_active: boolean
  created_at: string
  partner_bank_id?: string | null
}

interface PageProps {
  params: Promise<{ farmerId: string }>
}

function memberMonths(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
}

const ROLE_LABEL: Record<string, string> = {
  lender: '🏦 Lender',
  supplier: '📦 Supplier',
  govt_officer: '🏛 Govt Officer',
  extension_officer: '👩‍💼 Extension Officer',
  buyer: '🤝 Buyer',
}

export default function UserDetailPage({ params }: PageProps) {
  const { farmerId } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const userQuery = useQuery({
    queryKey: ['admin', 'user', farmerId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${farmerId}`)
      if (!res.ok) throw new Error('User not found')
      const body = await res.json() as { data: AdminUser }
      return body.data
    },
  })

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin', 'user', farmerId] })

  const toggleMutation = useMutation({
    mutationFn: (is_active: boolean) =>
      fetch(`/api/admin/users/${farmerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => invalidate(),
  })

  const resetPinMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/admin/users/${farmerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_pin' }),
      }),
  })

  if (userQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-[56px] animate-pulse rounded-lg bg-[#F3F4F6]" />
        <div className="grid grid-cols-4 gap-[7px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[54px] animate-pulse rounded-lg bg-[#F3F4F6]" />
          ))}
        </div>
      </div>
    )
  }

  if (!userQuery.data) {
    return (
      <div className="flex h-64 items-center justify-center text-[10px] text-[#DC2626]">
        User not found
      </div>
    )
  }

  const user = userQuery.data
  const months = memberMonths(user.created_at)
  const seasons = Math.floor(months / 6)
  const initials = user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const busy = toggleMutation.isPending || resetPinMutation.isPending

  const subtitle =
    user.role === 'farmer'
      ? (() => {
          const ft = farmTypeInfo(user.role)
          return `${ft.emojis} ${ft.label} · ${user.county} County · ${user.phone} · Member ${months} months · ${seasons} full seasons`
        })()
      : `${ROLE_LABEL[user.role] ?? user.role} · ${user.county} County · ${user.phone} · Member ${months} months`

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#1A6B3C',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {user.full_name}
          </div>
          <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>
            {subtitle}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'row', gap: 5 }}>
          {user.role !== 'farmer' && ROLE_TO_TYPE[user.role] && (
            <button
              className="w-btn"
              onClick={() => router.push(`/admin/users/${farmerId}/edit`)}
              disabled={busy}
            >
              ✏️ Edit Details
            </button>
          )}
          <button
            className="w-btn"
            onClick={() => resetPinMutation.mutate()}
            disabled={busy}
          >
            Reset PIN
          </button>
          <button
            className="w-btn"
            style={{ backgroundColor: '#DC2626' }}
            onClick={() => toggleMutation.mutate(!user.is_active)}
            disabled={busy}
          >
            {user.is_active ? 'Disable Account' : 'Enable Account'}
          </button>
        </div>
      </div>

      {/* Role-specific body */}
      {user.role === 'farmer' && <FarmerDetailView farmerId={user.id} role={user.role} />}
      {user.role === 'lender' && <LenderDetailView partnerBankId={user.partner_bank_id} />}
      {user.role === 'supplier' && <SupplierDetailView supplierId={user.id} />}
      {user.role !== 'farmer' && user.role !== 'lender' && user.role !== 'supplier' && <GenericStaffDetailView />}
    </div>
  )
}
