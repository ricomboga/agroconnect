'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable, FormSection, FieldGroup, Field, TextInput, Select, KpiCard } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface FarmerOption {
  farmerId: string
  fullName: string | null
}

interface Distribution {
  id: string
  farmerId: string
  inputType: string
  valueKes: string
  distributedAt: string
}

const INPUT_TYPES = ['Seeds', 'Fertiliser', 'Pesticide', 'Tools', 'Livestock Feed', 'Other'] as const

function formatKes(amount: string | number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(amount))
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InputDistributionView() {
  const queryClient = useQueryClient()
  const [farmerId, setFarmerId] = useState('')
  const [inputType, setInputType] = useState<string>(INPUT_TYPES[0])
  const [valueKes, setValueKes] = useState('')
  const [distributedAt, setDistributedAt] = useState(todayIso())
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: farmers = [] } = useQuery({
    queryKey: ['lender', 'reports', 'farmers-roster'],
    queryFn: async () => {
      const res = await fetch('/api/finance/lender/reports/farmers')
      if (!res.ok) throw new Error('Failed to load farmers')
      const body = (await res.json()) as { data: FarmerOption[] }
      return body.data
    },
  })

  const { data: distributions = [], isLoading } = useQuery({
    queryKey: ['lender', 'input-distributions', from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.set('from_date', from)
      if (to) params.set('to_date', to)
      const res = await fetch(`/api/finance/lender/input-distributions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load input distributions')
      const body = (await res.json()) as { data: Distribution[] }
      return body.data
    },
  })

  const farmerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of farmers) map.set(f.farmerId, f.fullName ?? f.farmerId)
    return map
  }, [farmers])

  const totalValueKes = useMemo(() => distributions.reduce((sum, d) => sum + Number(d.valueKes), 0), [distributions])

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/finance/lender/input-distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId, inputType, valueKes: Number(valueKes), distributedAt }),
      })
      if (!res.ok) throw new Error('Failed to record input distribution')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Input distribution recorded')
      setFarmerId('')
      setValueKes('')
      setDistributedAt(todayIso())
      void queryClient.invalidateQueries({ queryKey: ['lender', 'input-distributions'] })
    },
    onError: () => toast.error('Failed to record input distribution'),
  })

  const columns: DataTableColumn<Distribution>[] = [
    { key: 'farmerId', header: 'Farmer', render: (row) => farmerNameById.get(row.farmerId) ?? row.farmerId },
    { key: 'inputType', header: 'Input Type' },
    { key: 'valueKes', header: 'Approx. Value', render: (row) => formatKes(row.valueKes) },
    { key: 'distributedAt', header: 'Date', render: (row) => new Date(row.distributedAt).toLocaleDateString('en-KE') },
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Input Distribution</p>
        <p className="mt-0.5 text-sm text-muted">Record farm inputs distributed to farmers under your programme</p>
      </div>

      <div className="mb-3.5 rounded-base border border-border bg-white p-4">
        <FormSection title="Distribute Input">
          <FieldGroup cols={2}>
            <Field label="Farmer" required>
              <Select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
                <option value="">Select farmer…</option>
                {farmers.map((f) => (
                  <option key={f.farmerId} value={f.farmerId}>
                    {f.fullName ?? f.farmerId}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type of Input" required>
              <Select value={inputType} onChange={(e) => setInputType(e.target.value)}>
                {INPUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldGroup>
          <FieldGroup cols={2}>
            <Field label="Approx. Value in Cash (KES)" required>
              <TextInput type="number" value={valueKes} onChange={(e) => setValueKes(e.target.value)} placeholder="e.g. 2500" />
            </Field>
            <Field label="Date" required>
              <TextInput type="date" value={distributedAt} onChange={(e) => setDistributedAt(e.target.value)} />
            </Field>
          </FieldGroup>
        </FormSection>
        <button
          type="button"
          disabled={createMutation.isPending || !farmerId || !inputType || !valueKes || !distributedAt}
          onClick={() => createMutation.mutate()}
          className="mt-3 rounded-md bg-ac-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          💾 Record Distribution
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <KpiCard variant="blue" value={distributions.length} label="Distributions" />
        <KpiCard variant="green" value={formatKes(totalValueKes)} label="Total Value Distributed" />
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Distribution History</p>
          <div className="flex items-center gap-2">
            <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
            <span className="text-sm text-muted">to</span>
            <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
        </div>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : distributions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No input distributions recorded in this date range</p>
        ) : (
          <DataTable columns={columns} data={distributions} />
        )}
      </div>
    </div>
  )
}
