'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface AdminUser {
  id: string
  full_name: string
  phone: string
  role: string
  county: string
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected'
  is_active: boolean
  created_at: string
}

interface UsersResponse {
  data: AdminUser[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

const ROLE_LABELS: Record<string, string> = {
  farmer: '🌾 Farmer',
  lender: '🏦 Lender',
  supplier: '📦 Supplier',
  govt_officer: '🏛 Govt Officer',
  extension_officer: '👩‍💼 Extension',
  buyer: '🤝 Buyer',
}

const KYC_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  verified:  { bg: '#EAF4EE', color: '#0D4A28', label: 'Verified' },
  pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  submitted: { bg: '#FEF3C7', color: '#92400E', label: 'Submitted' },
  rejected:  { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
}

const TEST_USERS: AdminUser[] = [
  { id: '1', full_name: 'Jane Wanjiru',  phone: '+254712345678', role: 'farmer',   county: 'Nakuru',  kyc_status: 'verified', is_active: true,  created_at: '2025-01-15T00:00:00Z' },
  { id: '2', full_name: 'David Kimani',  phone: '+254722345679', role: 'supplier', county: 'Nairobi', kyc_status: 'pending',  is_active: true,  created_at: '2025-02-20T00:00:00Z' },
  { id: '3', full_name: 'Mary Achieng',  phone: '+254733345680', role: 'farmer',   county: 'Meru',    kyc_status: 'verified', is_active: false, created_at: '2025-03-10T00:00:00Z' },
]

const wbtn: React.CSSProperties = {
  backgroundColor: '#1A6B3C',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  paddingTop: 9,
  paddingBottom: 9,
  paddingLeft: 10,
  paddingRight: 10,
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
}

function wbtnSm(color: string, border: string): React.CSSProperties {
  return {
    color,
    border: `1px solid ${border}`,
    backgroundColor: 'transparent',
    borderRadius: 5,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    fontSize: 9,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}

const selectStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  borderRadius: 4,
  padding: '5px 8px',
  fontSize: 11,
  color: '#374151',
  backgroundColor: '#fff',
  outline: 'none',
}

const thStyle: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  padding: '5px 6px',
  borderBottom: '1px solid #E5E7EB',
  textAlign: 'left',
  letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  fontSize: 9,
  padding: '5px 6px',
  borderBottom: '1px solid #E5E7EB',
  color: '#374151',
}

function KycBadge({ status }: { status: string }) {
  const b = KYC_BADGE[status] ?? KYC_BADGE.pending
  return (
    <span style={{
      backgroundColor: b.bg, color: b.color,
      borderRadius: 8, paddingLeft: 6, paddingRight: 6,
      paddingTop: 2, paddingBottom: 2, fontSize: 8, fontWeight: 600,
    }}>
      {b.label}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      backgroundColor: active ? '#EAF4EE' : '#FEE2E2',
      color: active ? '#0D4A28' : '#991B1B',
      borderRadius: 8, paddingLeft: 6, paddingRight: 6,
      paddingTop: 2, paddingBottom: 2, fontSize: 8, fontWeight: 600,
    }}>
      {active ? 'Active' : 'Disabled'}
    </span>
  )
}

export function UsersTable() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = 20
  const role = searchParams.get('role') ?? ''
  const kyc = searchParams.get('kyc') ?? ''
  const status = searchParams.get('status') ?? ''
  const q = searchParams.get('q') ?? ''

  const [searchVal, setSearchVal] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearchChange(val: string) {
    setSearchVal(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParams({ q: val, page: '1' }), 300)
  }

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { page, pageSize, role, kyc, status, q }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...(role   && { role }),
        ...(kyc    && { kyc_status: kyc }),
        ...(status && { is_active: status === 'active' ? 'true' : 'false' }),
        ...(q      && { q }),
      })
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load users')
      return res.json() as Promise<UsersResponse>
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      }),
    onSuccess: () => { invalidate(); toast.success('KYC verified') },
    onError: () => toast.error('Failed to verify KYC'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      }),
    onSuccess: () => { invalidate(); toast.success('KYC rejected') },
    onError: () => toast.error('Failed to reject KYC'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: (_, vars) => {
      invalidate()
      toast.success(vars.is_active ? 'Account enabled' : 'Account disabled')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const busy = verifyMutation.isPending || rejectMutation.isPending || toggleMutation.isPending

  const meta = data?.meta
  const users = data?.data?.length ? data.data : TEST_USERS
  const start = meta ? (meta.page - 1) * meta.page_size + 1 : 1
  const end   = meta ? Math.min(meta.page * meta.page_size, meta.total) : users.length
  const total = meta?.total ?? users.length

  return (
    <div>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>User Management</span>
        <button style={wbtn} onClick={() => router.push('/admin/users/new')}>
          ➕ Create New User
        </button>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          value={searchVal}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="🔍 Search by name or phone..."
          style={{
            flex: 1,
            border: '1px solid #E5E7EB',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 11,
            color: '#374151',
            backgroundColor: '#fff',
            outline: 'none',
          }}
        />
        <select value={role} onChange={(e) => updateParams({ role: e.target.value, page: '1' })} style={selectStyle}>
          <option value="">All Types</option>
          <option value="farmer">Farmer</option>
          <option value="lender">Lender</option>
          <option value="supplier">Supplier</option>
          <option value="govt_officer">Govt Officer</option>
        </select>
        <select value={kyc} onChange={(e) => updateParams({ kyc: e.target.value, page: '1' })} style={selectStyle}>
          <option value="">All KYC</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value, page: '1' })} style={selectStyle}>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="">All Status</option>
        </select>
      </div>

      {/* Data Table */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <thead style={{ backgroundColor: '#F9FAFB' }}>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>County</th>
              <th style={thStyle}>KYC</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: 20, color: '#6B7280' }}>
                  Loading...
                </td>
              </tr>
            ) : users.map((u) => (
              <tr
                key={u.id}
                style={{ backgroundColor: '#fff' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff' }}
              >
                <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{u.full_name}</td>
                <td style={tdStyle}>{u.phone}</td>
                <td style={tdStyle}>{ROLE_LABELS[u.role] ?? u.role}</td>
                <td style={tdStyle}>{u.county}</td>
                <td style={tdStyle}><KycBadge status={u.kyc_status} /></td>
                <td style={tdStyle}><StatusBadge active={u.is_active} /></td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href={`/admin/users/${u.id}`} style={{ textDecoration: 'none' }}>
                      <button style={wbtnSm('#1A6B3C', '#1A6B3C')}>View</button>
                    </Link>
                    {(u.kyc_status === 'pending' || u.kyc_status === 'submitted') && (
                      <>
                        <button
                          style={wbtnSm('#1A6B3C', '#1A6B3C')}
                          onClick={() => verifyMutation.mutate(u.id)}
                          disabled={busy}
                        >
                          ✓ Verify
                        </button>
                        <button
                          style={wbtnSm('#DC2626', '#DC2626')}
                          onClick={() => rejectMutation.mutate(u.id)}
                          disabled={busy}
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {u.is_active ? (
                      <button
                        style={wbtnSm('#DC2626', '#DC2626')}
                        onClick={() => toggleMutation.mutate({ id: u.id, is_active: false })}
                        disabled={busy}
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        style={wbtnSm('#1A6B3C', '#1A6B3C')}
                        onClick={() => toggleMutation.mutate({ id: u.id, is_active: true })}
                        disabled={busy}
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 9, color: '#6B7280' }}>
          Showing {start}–{end} of {total} users
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => updateParams({ page: String(page - 1) })}
            disabled={page <= 1}
            style={{ ...wbtnSm('#374151', '#E5E7EB'), opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Previous
          </button>
          <button
            onClick={() => updateParams({ page: String(page + 1) })}
            disabled={!meta || page >= meta.total_pages}
            style={{ ...wbtnSm('#374151', '#E5E7EB'), opacity: (!meta || page >= meta.total_pages) ? 0.4 : 1, cursor: (!meta || page >= meta.total_pages) ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
