'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable, StatusBadge, FormSection, FieldGroup, Field, TextInput, Select } from '@agroconnect/web-ui'
import type { DataTableColumn } from '@agroconnect/web-ui'

interface Institution {
  id: string
  type: string
}

interface Product {
  id: string
  partnerId: string
  name: string
  category: string
  interestRate: number
  minAmountKes: number
  maxAmountKes: number
  repaymentMonths: number
  eligibilityBand: string
}

export function ProductsView() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('farm_input')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [rate, setRate] = useState('')
  const [term, setTerm] = useState('')
  const [band, setBand] = useState('B')

  const { data: institution } = useQuery({
    queryKey: ['lender', 'institution'],
    queryFn: async () => {
      const res = await fetch('/api/lender/institution')
      if (!res.ok) return null
      const body = (await res.json()) as { data: Institution }
      return body.data
    },
  })

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['lender', 'products'],
    queryFn: async () => {
      const res = await fetch('/api/finance/products')
      if (!res.ok) throw new Error('Failed to load products')
      const body = (await res.json()) as { data: Product[] }
      return body.data
    },
  })

  const products = useMemo(
    () => allProducts.filter((p) => !institution || p.partnerId === institution.id),
    [allProducts, institution],
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/lender/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          minAmountKes: Number(minAmount),
          maxAmountKes: Number(maxAmount),
          interestRate: Number(rate),
          repaymentMonths: Number(term),
          eligibilityBand: band,
        }),
      })
      if (!res.ok) throw new Error('Failed to save product')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Product saved (draft, not yet reflected in the live catalogue)')
      setShowForm(false)
      void queryClient.invalidateQueries({ queryKey: ['lender', 'products'] })
    },
    onError: () => toast.error('Failed to save product'),
  })

  const columns: DataTableColumn<Product>[] = [
    { key: 'name', header: 'Product' },
    { key: 'category', header: 'Type' },
    { key: 'eligibilityBand', header: 'Min Band', render: (p) => <StatusBadge variant="blue">{p.eligibilityBand}</StatusBadge> },
    { key: 'maxAmountKes', header: 'Max Amount', render: (p) => `KES ${p.maxAmountKes.toLocaleString()}` },
    { key: 'interestRate', header: 'Rate', render: (p) => `${p.interestRate}%` },
    { key: 'repaymentMonths', header: 'Term', render: (p) => `${p.repaymentMonths} mo` },
    { key: 'status', header: 'Status', render: () => <StatusBadge variant="green">Active</StatusBadge> },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-ink">Loan Products</p>
          <p className="mt-0.5 text-sm text-muted">Products offered by your institution</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-ac-green px-3 py-1.5 text-sm font-semibold text-white"
        >
          {showForm ? 'Cancel' : '➕ Add Product'}
        </button>
      </div>

      {showForm && (
        <div className="mb-3.5 rounded-base border border-border bg-white p-4">
          <FormSection title="New Loan Product">
            <Field label="Product Name" required>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kilimo Working Capital" />
            </Field>
            <FieldGroup cols={2}>
              <Field label="Loan Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="farm_input">Farm Input</option>
                  <option value="asset_finance">Asset Finance</option>
                  <option value="back_to_school">Back to School</option>
                  <option value="emergency">Emergency</option>
                  <option value="general">General</option>
                </Select>
              </Field>
              <Field label="Minimum Eligibility Band">
                <Select value={band} onChange={(e) => setBand(e.target.value)}>
                  <option value="A">Band A</option>
                  <option value="B">Band B</option>
                  <option value="C">Band C</option>
                  <option value="D">Band D</option>
                </Select>
              </Field>
            </FieldGroup>
            <FieldGroup cols={2}>
              <Field label="Min Amount (KES)">
                <TextInput type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
              </Field>
              <Field label="Max Amount (KES)">
                <TextInput type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
              </Field>
            </FieldGroup>
            <FieldGroup cols={2}>
              <Field label="Interest Rate (% p.a.)">
                <TextInput type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
              </Field>
              <Field label="Max Term (months)">
                <TextInput type="number" value={term} onChange={(e) => setTerm(e.target.value)} />
              </Field>
            </FieldGroup>
          </FormSection>
          <button
            type="button"
            disabled={createMutation.isPending || !name || !minAmount || !maxAmount || !rate || !term}
            onClick={() => createMutation.mutate()}
            className="rounded-md bg-ac-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            💾 Save Product
          </button>
        </div>
      )}

      <div className="rounded-base border border-border bg-white px-4 py-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : products.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No products yet</p>
        ) : (
          <DataTable columns={columns} data={products} />
        )}
      </div>
    </div>
  )
}
