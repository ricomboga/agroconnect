'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
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
  is_verified: boolean
  created_at: string
}

interface UsersResponse {
  data: AdminUser[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}

const ALL_ROLES = [
  { value: 'farmer',            label: 'Farmer' },
  { value: 'extension_officer', label: 'Extension Officer' },
  { value: 'vet_officer',       label: 'Vet Officer' },
  { value: 'supplier',          label: 'Supplier' },
  { value: 'buyer',             label: 'Buyer' },
  { value: 'govt_officer',      label: 'Govt Officer' },
  { value: 'lender',            label: 'Lender' },
  { value: 'admin',             label: 'Admin' },
]

const KYC_VARIANTS: Record<string, BadgeProps['variant']> = {
  verified: 'success', rejected: 'destructive', pending: 'warning', submitted: 'warning',
}

// ─── Create User Modal ──────────────────────────────────────────────────────

interface CreateModalProps { onClose: () => void; onCreated: () => void }

function CreateUserModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', password: '', role: 'farmer', county: '', language: 'sw',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function field(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.fullName.trim()) errs.fullName = 'Required'
    if (!form.phone.trim()) errs.phone = 'Required'
    if (form.password.length < 8) errs.password = 'Minimum 8 characters'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          email: form.email || undefined,
          password: form.password,
          role: form.role,
          county: form.county || undefined,
          language: form.language,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Failed to create user')
      }
      toast.success(`${form.fullName} created successfully`)
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700'
  const errCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Create User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={form.fullName} onChange={(e) => field('fullName', e.target.value)} placeholder="Jane Doe" />
              {errors.fullName && <p className={errCls}>{errors.fullName}</p>}
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={(e) => field('phone', e.target.value)} placeholder="+254712000000" />
              {errors.phone && <p className={errCls}>{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Email (optional)</label>
            <input className={inputCls} type="email" value={form.email} onChange={(e) => field('email', e.target.value)} placeholder="jane@example.com" />
          </div>

          <div>
            <label className={labelCls}>Password</label>
            <input className={inputCls} type="password" value={form.password} onChange={(e) => field('password', e.target.value)} placeholder="Min 8 characters" />
            {errors.password && <p className={errCls}>{errors.password}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Role</label>
              <select className={inputCls} value={form.role} onChange={(e) => field('role', e.target.value)}>
                {ALL_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Language</label>
              <select className={inputCls} value={form.language} onChange={(e) => field('language', e.target.value)}>
                <option value="sw">Swahili</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>County (optional)</label>
            <input className={inputCls} value={form.county} onChange={(e) => field('county', e.target.value)} placeholder="Nairobi" />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Table ─────────────────────────────────────────────────────────────

export function UsersTable() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)

  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = Number(searchParams.get('page_size') ?? '10')
  const role = searchParams.get('role') ?? ''
  const county = searchParams.get('county') ?? ''

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { page, pageSize, role, county }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page), page_size: String(pageSize),
        ...(role && { role }), ...(county && { county }),
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: (_, vars) => { invalidate(); toast.success(vars.is_active ? 'Account enabled' : 'Account disabled') },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => { invalidate(); toast.success('User deleted'); setConfirmDelete(null) },
    onError: () => toast.error('Failed to delete user'),
  })

  const busy = verifyMutation.isPending || toggleMutation.isPending || deleteMutation.isPending

  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.full_name}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <span className="font-mono text-xs text-gray-600">{row.original.phone}</span>,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">{row.original.role.replace(/_/g, ' ')}</Badge>
      ),
    },
    { accessorKey: 'county', header: 'County' },
    {
      accessorKey: 'kyc_status',
      header: 'KYC',
      cell: ({ row }) => (
        <Badge variant={KYC_VARIANTS[row.original.kyc_status] ?? 'secondary'} className="capitalize">
          {row.original.kyc_status}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'destructive'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString('en-KE', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className="flex items-center gap-1.5">
            {u.kyc_status !== 'verified' && (
              <Button size="sm" onClick={() => verifyMutation.mutate(u.id)} disabled={busy}>
                Verify
              </Button>
            )}
            <Button
              size="sm"
              variant={u.is_active ? 'destructive' : 'outline'}
              onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
              disabled={busy}
            >
              {u.is_active ? 'Disable' : 'Enable'}
            </Button>
            <button
              onClick={() => setConfirmDelete(u)}
              disabled={busy}
              className="ml-1 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  const meta = data?.meta

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <select
            value={role}
            onChange={(e) => updateParams({ role: e.target.value, page: '1' })}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by county…"
            value={county}
            onChange={(e) => updateParams({ county: e.target.value, page: '1' })}
            className="w-44 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {meta && (
            <span className="text-sm text-gray-500">{meta.total.toLocaleString()} users</span>
          )}
          <Button className="ml-auto" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create User
          </Button>
        </div>

        <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} />

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => updateParams({ page_size: e.target.value, page: '1' })}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
          {meta && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Page {meta.page} of {meta.total_pages}</span>
              <Button size="sm" variant="outline" onClick={() => updateParams({ page: String(page - 1) })} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateParams({ page: String(page + 1) })} disabled={page >= meta.total_pages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={invalidate} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete user?</h3>
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-medium text-gray-800">{confirmDelete.full_name}</span> ({confirmDelete.phone}) will be permanently deleted along with all their sessions. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleteMutation.isPending}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
