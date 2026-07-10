'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'

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
}

const KYC_VARIANTS: Record<string, BadgeProps['variant']> = {
  verified: 'success',
  rejected: 'destructive',
  pending: 'warning',
  submitted: 'warning',
}

interface FarmerProfileCardProps {
  user: AdminUser
  farmerId: string
}

export function FarmerProfileCard({ user, farmerId }: FarmerProfileCardProps) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin', 'user', farmerId] })

  const verifyMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/admin/users/${farmerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      }),
    onSuccess: () => { invalidate(); toast.success('KYC verified') },
    onError: () => toast.error('Failed to verify KYC'),
  })

  const toggleMutation = useMutation({
    mutationFn: (is_active: boolean) =>
      fetch(`/api/admin/users/${farmerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: (_, is_active) => {
      invalidate()
      toast.success(is_active ? 'Account enabled' : 'Account disabled')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const busy = verifyMutation.isPending || toggleMutation.isPending

  const joinedDate = new Date(user.created_at).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="mb-6">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="mb-3 inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827]"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Users
      </Link>

      {/* Profile strip */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1A6B3C] text-xl font-bold text-white">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#111827]">{user.full_name}</h1>
              <Badge variant={user.is_active ? 'success' : 'destructive'} className="text-xs">
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge
                variant={KYC_VARIANTS[user.kyc_status] ?? 'secondary'}
                className="capitalize text-xs"
              >
                KYC: {user.kyc_status}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-[#6B7280]">
              <span>{user.phone}</span>
              {user.email && <span>{user.email}</span>}
              {user.county && <span>{user.county} County</span>}
              <span className="capitalize">{user.role.replace(/_/g, ' ')}</span>
              <span>Joined {joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user.kyc_status !== 'verified' && (
            <Button size="sm" onClick={() => verifyMutation.mutate()} disabled={busy}>
              Verify KYC
            </Button>
          )}
          <Button
            size="sm"
            variant={user.is_active ? 'destructive' : 'outline'}
            onClick={() => toggleMutation.mutate(!user.is_active)}
            disabled={busy}
          >
            {user.is_active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>
    </div>
  )
}
