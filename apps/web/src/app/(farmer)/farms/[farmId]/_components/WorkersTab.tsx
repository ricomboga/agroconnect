'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

type WorkerRole = 'manager' | 'field_worker' | 'harvester' | 'sprayer' | 'driver'

interface Worker {
  id: string
  userId: string
  farmId: string
  role: WorkerRole
  status: 'active' | 'inactive'
  user: {
    fullName: string
    phone: string
  }
}

interface WorkersResponse {
  data: Worker[]
}

interface ApiError {
  message?: string
  error?: { message?: string }
}

const ROLES: { value: WorkerRole; label: string }[] = [
  { value: 'manager',      label: 'Manager'      },
  { value: 'field_worker', label: 'Field Worker'  },
  { value: 'harvester',    label: 'Harvester'     },
  { value: 'sprayer',      label: 'Sprayer'       },
  { value: 'driver',       label: 'Driver'        },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone
  return `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`
}

const inputCls =
  'border border-[#E5E7EB] rounded-[5px] py-[7px] px-[9px] text-[10px] text-[#111827] bg-[#F9FAFB] focus:outline-none focus:border-[#1A6B3C]'

// ── WorkersTab ────────────────────────────────────────────────────────────────

export function WorkersTab({ farmId }: { farmId: string }) {
  const queryClient = useQueryClient()

  const [addPhone, setAddPhone] = useState('')
  const [addRole,  setAddRole]  = useState<WorkerRole>('field_worker')
  const [adding,   setAdding]   = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<WorkersResponse>({
    queryKey: ['farm', farmId, 'workers'],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}/workers`)
      if (!res.ok) throw new Error('Failed to load workers')
      return res.json() as Promise<WorkersResponse>
    },
  })

  const workers = data?.data ?? []
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['farm', farmId, 'workers'] })

  // ── inline role change ────────────────────────────────────────────────────

  const roleMutation = useMutation({
    mutationFn: ({ workerId, role }: { workerId: string; role: WorkerRole }) =>
      fetch(`/api/farm/farms/${farmId}/workers/${workerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })

  // ── remove worker ─────────────────────────────────────────────────────────

  const removeMutation = useMutation({
    mutationFn: (workerId: string) =>
      fetch(`/api/farm/farms/${farmId}/workers/${workerId}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      setConfirmRemoveId(null)
      toast.success('Worker removed')
    },
    onError: () => toast.error('Failed to remove worker'),
  })

  // ── add worker ────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addPhone.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/farm/farms/${farmId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: addPhone.trim(), role: addRole }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError
        throw new Error(body.message ?? body.error?.message ?? 'Failed to add worker')
      }
      toast.success('Worker added to farm')
      setAddPhone('')
      setAddRole('field_worker')
      invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add worker')
    } finally {
      setAdding(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <p className="text-[9px] text-[#6B7280]">
        Manage who works on this farm and their roles.
      </p>

      {/* Worker table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#1A6B3C]" />
        </div>
      ) : workers.length === 0 ? (
        <div className="rounded-[8px] border-2 border-dashed border-[#E5E7EB] py-8 text-center">
          <p className="text-[10px] font-semibold text-[#6B7280] mb-1">No workers yet</p>
          <p className="text-[9px] text-[#9CA3AF]">Add workers by phone number below.</p>
        </div>
      ) : (
        <table className="w-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id}>
                <td className="font-medium text-[#111827]">{w.user.fullName}</td>
                <td className="font-mono">{maskPhone(w.user.phone)}</td>
                <td>
                  <select
                    className={inputCls + ' py-[4px]'}
                    value={w.role}
                    onChange={(e) =>
                      roleMutation.mutate({
                        workerId: w.id,
                        role: e.target.value as WorkerRole,
                      })
                    }
                    disabled={roleMutation.isPending}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span
                    className={
                      w.status === 'active' ? 'w-badge-green' : 'w-badge-amber'
                    }
                  >
                    {w.status}
                  </span>
                </td>
                <td>
                  {confirmRemoveId === w.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => removeMutation.mutate(w.id)}
                        disabled={removeMutation.isPending}
                        className="text-[9px] font-semibold text-[#DC2626] hover:opacity-75 disabled:opacity-50"
                      >
                        {removeMutation.isPending ? 'Removing…' : 'Confirm'}
                      </button>
                      <span className="text-[#9CA3AF]">·</span>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="text-[9px] text-[#6B7280] hover:opacity-75"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(w.id)}
                      className="text-[9px] font-semibold text-[#DC2626] hover:opacity-75"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add worker section */}
      <div className="border-t border-[#E5E7EB] pt-4">
        <p className="text-[9px] font-bold text-[#1A6B3C] uppercase tracking-[0.8px] mb-3">
          Add Worker by Phone Number
        </p>
        <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="mb-1 block text-[9px] font-semibold text-[#374151]">
              Phone Number
            </label>
            <input
              className={inputCls + ' w-40'}
              placeholder="+254712345678"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              type="tel"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9px] font-semibold text-[#374151]">
              Role
            </label>
            <select
              className={inputCls}
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as WorkerRole)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={adding || !addPhone.trim()}
            className="w-btn flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <UserPlus className="h-3 w-3" />
            }
            {adding ? 'Adding…' : 'Add Worker'}
          </button>
        </form>
        <p className="mt-2 text-[9px] text-[#9CA3AF]">
          If no account is found for this number, ask an admin to create a worker account first.
        </p>
      </div>
    </div>
  )
}
