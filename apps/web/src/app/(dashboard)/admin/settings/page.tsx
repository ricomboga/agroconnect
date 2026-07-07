'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'
import { AlertBox, StatusBadge } from '@agroconnect/web-ui'
import { useAuthStore } from '@/stores/authStore'

interface AdminUserRow {
  id: string
  full_name: string
  phone: string
  role: string
  is_active: boolean
  is_super_admin?: boolean
  staff_role?: 'admin' | 'county_admin' | 'moderator'
}

const STAFF_ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  county_admin: 'County Admin',
  moderator: 'Moderator',
}

interface AuditLogRow {
  id: string
  actor: string
  action: string
  category: string
  refId: string | null
  note: string | null
  createdAt: string
}

const PERMISSIONS_MATRIX: { action: string; superAdmin: string; countyAdmin: string; moderator: string }[] = [
  { action: 'Create any user', superAdmin: '✓', countyAdmin: 'County only', moderator: '✗' },
  { action: 'Approve KYC', superAdmin: '✓', countyAdmin: '✓', moderator: '✗' },
  { action: 'Create programs', superAdmin: '✓', countyAdmin: 'County only', moderator: '✗' },
  { action: 'Moderate content', superAdmin: '✓', countyAdmin: '✗', moderator: '✓' },
  { action: 'View analytics', superAdmin: '✓', countyAdmin: 'County only', moderator: '✗' },
  { action: 'Add admin users', superAdmin: '✓', countyAdmin: '✗', moderator: '✗' },
  { action: 'Platform settings', superAdmin: '✓', countyAdmin: '✗', moderator: '✗' },
]

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false)
  const [newAdminPhone, setNewAdminPhone] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [grantSuperAdmin, setGrantSuperAdmin] = useState(false)
  const [newAdminStaffRole, setNewAdminStaffRole] = useState<'admin' | 'county_admin' | 'moderator'>('admin')
  const [newAdminCounty, setNewAdminCounty] = useState('')

  const { data: adminsData } = useQuery({
    queryKey: ['admin', 'settings', 'admins'],
    queryFn: async () => {
      const res = await api.get<{ data: AdminUserRow[] }>('/api/v1/admin/users?role=admin&page_size=50')
      return res.data.data
    },
  })

  const { data: auditData } = useQuery({
    queryKey: ['admin', 'settings', 'audit-log'],
    queryFn: async () => {
      const res = await api.get<{ data: AuditLogRow[] }>('/api/v1/admin/audit-log?page_size=20')
      return res.data.data
    },
  })

  const addAdminMutation = useMutation({
    mutationFn: () =>
      api.post('/api/v1/admin/users', {
        phone: newAdminPhone,
        password: 'Agro1234',
        fullName: newAdminName,
        role: 'admin',
        isSuperAdmin: grantSuperAdmin,
        staffRole: grantSuperAdmin ? 'admin' : newAdminStaffRole,
        county: newAdminStaffRole === 'county_admin' ? newAdminCounty : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'admins'] })
      toast.success('Admin account created')
      setNewAdminPhone('')
      setNewAdminName('')
      setGrantSuperAdmin(false)
      setNewAdminStaffRole('admin')
      setNewAdminCounty('')
    },
    onError: () => toast.error('Failed to create admin'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/admin/users/${id}/status`, { is_active: false }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'admins'] })
      toast.success('Admin deactivated')
    },
    onError: () => toast.error('Failed to deactivate admin'),
  })

  return (
    <div>
      <p className="mb-4 text-lg font-bold text-ink">Platform Settings</p>

      <div className="mb-4 rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">SMS Provider, Africa&apos;s Talking</p>
        <AlertBox variant="blue">
          Configured via environment variables (AT_API_KEY, AT_USERNAME) on notification-service. Not
          editable here per the platform&apos;s secrets policy. Contact infra to rotate credentials.
        </AlertBox>
      </div>

      <div className="mb-4 rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">M-Pesa Integration (Daraja API)</p>
        <AlertBox variant="blue">
          Configured via environment variables (MPESA_CONSUMER_KEY, MPESA_SHORTCODE, etc.) on
          finance-service. Not editable here per the platform&apos;s secrets policy.
        </AlertBox>
      </div>

      <div className="mb-4 rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Admin User Management</p>
        </div>
        {!isSuperAdmin && (
          <AlertBox variant="blue">
            Only a super admin can create or remove staff accounts. You can view existing staff below.
          </AlertBox>
        )}
        {isSuperAdmin && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="Full name"
              className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base"
            />
            <input
              value={newAdminPhone}
              onChange={(e) => setNewAdminPhone(e.target.value)}
              placeholder="+254712345678"
              className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base"
            />
            <select
              value={newAdminStaffRole}
              onChange={(e) => setNewAdminStaffRole(e.target.value as 'admin' | 'county_admin' | 'moderator')}
              disabled={grantSuperAdmin}
              className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base disabled:opacity-50"
            >
              <option value="admin">Admin</option>
              <option value="county_admin">County Admin</option>
              <option value="moderator">Moderator</option>
            </select>
            {newAdminStaffRole === 'county_admin' && !grantSuperAdmin && (
              <input
                value={newAdminCounty}
                onChange={(e) => setNewAdminCounty(e.target.value)}
                placeholder="County"
                className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-base"
              />
            )}
            <label className="flex items-center gap-1.5 text-sm text-ink2">
              <input
                type="checkbox"
                checked={grantSuperAdmin}
                onChange={(e) => setGrantSuperAdmin(e.target.checked)}
              />
              Grant super admin
            </label>
            <button
              type="button"
              disabled={!newAdminName || !newAdminPhone || addAdminMutation.isPending}
              onClick={() => addAdminMutation.mutate()}
              className="rounded-md bg-ac-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              + Add Admin
            </button>
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {(adminsData ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-none">
              <span className="text-ink">
                {a.full_name} <span className="text-muted">({a.phone})</span>
                {a.is_super_admin && (
                  <span className="ml-1.5 rounded-sm bg-ac-amber-light px-1.5 py-0.5 text-xs font-semibold text-ac-amber">
                    Super Admin
                  </span>
                )}
                {!a.is_super_admin && a.staff_role && a.staff_role !== 'admin' && (
                  <span className="ml-1.5 rounded-sm bg-ac-blue-light px-1.5 py-0.5 text-xs font-semibold text-ac-blue">
                    {STAFF_ROLE_LABEL[a.staff_role]}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge variant={a.is_active ? 'green' : 'red'}>{a.is_active ? 'Active' : 'Inactive'}</StatusBadge>
                {isSuperAdmin && a.is_active && (
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(a.id)}
                    className="text-xs font-semibold text-ac-red"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Role Permissions Matrix</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="py-1.5">Action</th>
              <th className="py-1.5">Super Admin</th>
              <th className="py-1.5">County Admin</th>
              <th className="py-1.5">Moderator</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS_MATRIX.map((row) => (
              <tr key={row.action} className="border-b border-border last:border-none">
                <td className="py-1.5 text-ink2">{row.action}</td>
                <td className="py-1.5">{row.superAdmin}</td>
                <td className="py-1.5">{row.countyAdmin}</td>
                <td className="py-1.5">{row.moderator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Audit Log, Recent Actions</p>
        <div className="flex flex-col gap-2">
          {(auditData ?? []).map((entry) => (
            <div key={entry.id} className="border-b border-border py-1.5 text-sm last:border-none">
              <p className="font-semibold text-ink">{entry.action}</p>
              <p className="text-xs text-muted">
                {entry.actor} · {new Date(entry.createdAt).toLocaleString()}
                {entry.note ? ` · ${entry.note}` : ''}
              </p>
            </div>
          ))}
          {(auditData ?? []).length === 0 && <p className="text-sm text-muted">No audit entries yet</p>}
        </div>
      </div>
    </div>
  )
}
