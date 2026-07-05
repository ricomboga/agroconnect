'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable, StatusBadge, FormSection, FieldGroup, Field, TextInput } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface GrantProgram {
  id: string
  name: string
  totalBudgetKes: number
  maxBeneficiaries: number
  active: boolean
}

export function GrantProgramsView() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [maxBeneficiaries, setMaxBeneficiaries] = useState('')

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['lender', 'grant-programs'],
    queryFn: async () => {
      const res = await fetch('/api/lender/grant-programs')
      if (!res.ok) throw new Error('Failed to load grant programs')
      const body = (await res.json()) as { data: GrantProgram[] }
      return body.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/lender/grant-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          totalBudgetKes: Number(budget),
          maxBeneficiaries: Number(maxBeneficiaries),
        }),
      })
      if (!res.ok) throw new Error('Failed to save grant programme')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Grant programme created')
      setShowForm(false)
      setName('')
      setBudget('')
      setMaxBeneficiaries('')
      void queryClient.invalidateQueries({ queryKey: ['lender', 'grant-programs'] })
    },
    onError: () => toast.error('Failed to save grant programme'),
  })

  const columns: DataTableColumn<GrantProgram>[] = [
    { key: 'name', header: 'Programme' },
    { key: 'totalBudgetKes', header: 'Budget', render: (p) => `KES ${p.totalBudgetKes.toLocaleString()}` },
    { key: 'maxBeneficiaries', header: 'Max Beneficiaries' },
    { key: 'active', header: 'Status', render: (p) => <StatusBadge variant={p.active ? 'green' : 'amber'}>{p.active ? 'Open' : 'Closed'}</StatusBadge> },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Grant Programs</p>
          <p className="mt-0.5 text-sm text-muted">Manage the grant programmes your organisation runs</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-ac-green px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Cancel' : '➕ New Programme'}
        </button>
      </div>

      {showForm && (
        <div className="mb-3.5 rounded-base border border-border bg-white p-4">
          <FormSection title="New Grant Programme">
            <Field label="Programme Name" required>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Improved Yield Grant" />
            </Field>
            <FieldGroup cols={2}>
              <Field label="Total Budget (KES)">
                <TextInput type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </Field>
              <Field label="Max Beneficiaries">
                <TextInput type="number" value={maxBeneficiaries} onChange={(e) => setMaxBeneficiaries(e.target.value)} />
              </Field>
            </FieldGroup>
          </FormSection>
          <button
            type="button"
            disabled={createMutation.isPending || !name || !budget || !maxBeneficiaries}
            onClick={() => createMutation.mutate()}
            className="rounded-md bg-ac-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            💾 Save Programme
          </button>
        </div>
      )}

      <div className="rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : programs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No grant programmes yet</p>
        ) : (
          <DataTable columns={columns} data={programs} />
        )}
      </div>
    </div>
  )
}
