'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Field, FieldGroup, Select, DataTable } from '@agroconnect/web-ui'

interface AuditLogRow {
  id: string
  actor: string
  action: string
  category: string
  refId: string | null
  note: string | null
  createdAt: string
}

interface CountyFarmerCount {
  county: string
  farmerCount: number
}

interface CountyLivestockCount {
  county: string
  animalType: string
  totalCount: number
}

interface InstitutionLoanTotal {
  institutionId: string
  institutionName: string
  totalDisbursedKes: number
}

async function downloadReportCsv(
  type: 'farmers-by-county' | 'livestock' | 'loans-by-institution',
  params: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const res = await api.get<Blob>(`/api/v1/admin/reports/${type}/export?${query.toString()}`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `${type}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}

export function ReportsContent() {
  const [livestockCounty, setLivestockCounty] = useState('')
  const [livestockAnimalType, setLivestockAnimalType] = useState('')

  const { data: farmersByCounty, isFetching: isFarmersLoading } = useQuery({
    queryKey: ['admin', 'reports', 'farmers-by-county'],
    queryFn: async () => {
      const res = await api.get<{ data: CountyFarmerCount[] }>('/api/v1/admin/reports/farmers-by-county')
      return res.data.data
    },
  })

  const { data: allLivestock } = useQuery({
    queryKey: ['admin', 'reports', 'livestock', 'unfiltered'],
    queryFn: async () => {
      const res = await api.get<{ data: CountyLivestockCount[] }>('/api/v1/admin/reports/livestock')
      return res.data.data
    },
  })

  const { data: livestock, isFetching: isLivestockLoading } = useQuery({
    queryKey: ['admin', 'reports', 'livestock', livestockCounty, livestockAnimalType],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (livestockCounty) query.set('county', livestockCounty)
      if (livestockAnimalType) query.set('animalType', livestockAnimalType)
      const res = await api.get<{ data: CountyLivestockCount[] }>(
        `/api/v1/admin/reports/livestock?${query.toString()}`,
      )
      return res.data.data
    },
  })

  const { data: loansByInstitution, isFetching: isLoansLoading } = useQuery({
    queryKey: ['admin', 'reports', 'loans-by-institution'],
    queryFn: async () => {
      const res = await api.get<{ data: InstitutionLoanTotal[] }>('/api/v1/admin/reports/loans-by-institution')
      return res.data.data
    },
  })

  const { data: auditLog, isFetching: isAuditLoading } = useQuery({
    queryKey: ['admin', 'reports', 'audit-log'],
    queryFn: async () => {
      const res = await api.get<{ data: AuditLogRow[] }>('/api/v1/admin/audit-log?page=1&page_size=10')
      return res.data.data
    },
  })

  const countyOptions = Array.from(new Set((allLivestock ?? []).map((r) => r.county))).sort()
  const animalTypeOptions = Array.from(new Set((allLivestock ?? []).map((r) => r.animalType))).sort()

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">Platform Reports</p>
      </div>

      <div className="rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Farmers by County</p>
          <button
            type="button"
            onClick={() => downloadReportCsv('farmers-by-county')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Download CSV
          </button>
        </div>
        {isFarmersLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (farmersByCounty ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No farm data recorded yet</p>
        ) : (
          <DataTable<CountyFarmerCount>
            columns={[
              { key: 'county', header: 'County' },
              { key: 'farmerCount', header: 'Farmers' },
            ]}
            data={farmersByCounty ?? []}
          />
        )}
      </div>

      <div className="mt-3.5 rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Livestock by Species &amp; County</p>
          <button
            type="button"
            onClick={() =>
              downloadReportCsv('livestock', { county: livestockCounty, animalType: livestockAnimalType })
            }
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Download CSV
          </button>
        </div>
        <FieldGroup cols={2}>
          <Field label="County">
            <Select value={livestockCounty} onChange={(e) => setLivestockCounty(e.target.value)}>
              <option value="">All counties</option>
              {countyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Animal Type">
            <Select value={livestockAnimalType} onChange={(e) => setLivestockAnimalType(e.target.value)}>
              <option value="">All types</option>
              {animalTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGroup>
        {isLivestockLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (livestock ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No livestock data recorded yet</p>
        ) : (
          <DataTable<CountyLivestockCount>
            columns={[
              { key: 'county', header: 'County' },
              { key: 'animalType', header: 'Animal Type' },
              { key: 'totalCount', header: 'Total Count' },
            ]}
            data={livestock ?? []}
          />
        )}
      </div>

      <div className="mt-3.5 rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Loans Disbursed by Institution</p>
          <button
            type="button"
            onClick={() => downloadReportCsv('loans-by-institution')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Download CSV
          </button>
        </div>
        {isLoansLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (loansByInstitution ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No disbursed loans recorded yet</p>
        ) : (
          <DataTable<InstitutionLoanTotal>
            columns={[
              { key: 'institutionName', header: 'Institution' },
              {
                key: 'totalDisbursedKes',
                header: 'Total Disbursed',
                render: (row) => `KES ${row.totalDisbursedKes.toLocaleString()}`,
              },
            ]}
            data={loansByInstitution ?? []}
          />
        )}
      </div>

      <div className="mt-3.5 rounded-base border border-border bg-white px-4 py-3">
        <p className="mb-2 text-md font-semibold text-ink">Recent Platform Activity</p>
        {isAuditLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (auditLog ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No activity recorded yet</p>
        ) : (
          <DataTable<AuditLogRow>
            columns={[
              { key: 'createdAt', header: 'When', render: (row) => new Date(row.createdAt).toLocaleString() },
              { key: 'actor', header: 'Actor' },
              { key: 'category', header: 'Category' },
              { key: 'action', header: 'Action' },
              { key: 'note', header: 'Note', render: (row) => row.note ?? '—' },
            ]}
            data={auditLog ?? []}
          />
        )}
      </div>
    </div>
  )
}
