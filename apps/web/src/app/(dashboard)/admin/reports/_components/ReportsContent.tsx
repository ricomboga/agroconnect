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

interface ExpertDirectoryRow {
  id: string
  name: string
  providerType: string
  organisation: string | null
  licenceNumber: string | null
  maxFarmers: number | null
  countiesServed: string[]
}

interface SupplierDirectoryRow {
  id: string
  businessName: string
  businessRegNumber: string | null
  deliveryRadiusKm: string | null
  county: string
  subCounty: string | null
}

interface LenderDirectoryRow {
  id: string
  name: string
  type: string
  licenceNo: string | null
  paybill: string | null
  headOfficeCounty: string | null
  activeFarmers: number
}

interface OfficerDirectoryRow {
  id: string
  fullName: string
  phone: string
  ministry: string
  position: string
  staffId: string
  assignedCounty: string
  assignedSubCounty: string | null
}

async function downloadReportCsv(
  type: 'farmers-by-county' | 'livestock' | 'loans-by-institution' | 'experts' | 'suppliers' | 'lenders' | 'govt-officers',
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

  const { data: experts, isFetching: isExpertsLoading } = useQuery({
    queryKey: ['admin', 'reports', 'experts'],
    queryFn: async () => {
      const res = await api.get<{ data: ExpertDirectoryRow[] }>('/api/v1/admin/reports/experts')
      return res.data.data
    },
  })

  const { data: suppliers, isFetching: isSuppliersLoading } = useQuery({
    queryKey: ['admin', 'reports', 'suppliers'],
    queryFn: async () => {
      const res = await api.get<{ data: SupplierDirectoryRow[] }>('/api/v1/admin/reports/suppliers')
      return res.data.data
    },
  })

  const { data: lenders, isFetching: isLendersLoading } = useQuery({
    queryKey: ['admin', 'reports', 'lenders'],
    queryFn: async () => {
      const res = await api.get<{ data: LenderDirectoryRow[] }>('/api/v1/admin/reports/lenders')
      return res.data.data
    },
  })

  const { data: govtOfficers, isFetching: isGovtOfficersLoading } = useQuery({
    queryKey: ['admin', 'reports', 'govt-officers'],
    queryFn: async () => {
      const res = await api.get<{ data: OfficerDirectoryRow[] }>('/api/v1/admin/reports/govt-officers')
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
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Experts &amp; Service Providers</p>
          <button
            type="button"
            onClick={() => downloadReportCsv('experts')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Download CSV
          </button>
        </div>
        {isExpertsLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (experts ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No experts recorded yet</p>
        ) : (
          <DataTable<ExpertDirectoryRow>
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'providerType', header: 'Type' },
              { key: 'organisation', header: 'Organisation', render: (row) => row.organisation ?? '—' },
              { key: 'licenceNumber', header: 'Licence #', render: (row) => row.licenceNumber ?? '—' },
              { key: 'maxFarmers', header: 'Max Farmers', render: (row) => row.maxFarmers ?? '—' },
              { key: 'countiesServed', header: 'Counties', render: (row) => row.countiesServed.join(', ') || '—' },
            ]}
            data={experts ?? []}
          />
        )}
      </div>

      <div className="mt-3.5 rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Supplier Registry</p>
          <button
            type="button"
            onClick={() => downloadReportCsv('suppliers')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Download CSV
          </button>
        </div>
        {isSuppliersLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (suppliers ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No suppliers recorded yet</p>
        ) : (
          <DataTable<SupplierDirectoryRow>
            columns={[
              { key: 'businessName', header: 'Business' },
              { key: 'businessRegNumber', header: 'Reg. Number', render: (row) => row.businessRegNumber ?? '—' },
              { key: 'deliveryRadiusKm', header: 'Delivery', render: (row) => row.deliveryRadiusKm ?? '—' },
              {
                key: 'county',
                header: 'County / Sub-county',
                render: (row) => `${row.county}${row.subCounty ? `, ${row.subCounty}` : ''}`,
              },
            ]}
            data={suppliers ?? []}
          />
        )}
      </div>

      <div className="mt-3.5 rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Lending Institutions</p>
          <button
            type="button"
            onClick={() => downloadReportCsv('lenders')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Download CSV
          </button>
        </div>
        {isLendersLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (lenders ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No lending institutions recorded yet</p>
        ) : (
          <DataTable<LenderDirectoryRow>
            columns={[
              { key: 'name', header: 'Institution' },
              { key: 'type', header: 'Type' },
              { key: 'licenceNo', header: 'Licence No.', render: (row) => row.licenceNo ?? '—' },
              { key: 'paybill', header: 'Paybill', render: (row) => row.paybill ?? '—' },
              { key: 'headOfficeCounty', header: 'Head Office', render: (row) => row.headOfficeCounty ?? '—' },
              { key: 'activeFarmers', header: 'Active Farmers' },
            ]}
            data={lenders ?? []}
          />
        )}
      </div>

      <div className="mt-3.5 rounded-base border border-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-md font-semibold text-ink">Government Officers</p>
          <button
            type="button"
            onClick={() => downloadReportCsv('govt-officers')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Download CSV
          </button>
        </div>
        {isGovtOfficersLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : (govtOfficers ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No government officers recorded yet</p>
        ) : (
          <DataTable<OfficerDirectoryRow>
            columns={[
              { key: 'fullName', header: 'Name' },
              { key: 'ministry', header: 'Ministry / Agency' },
              { key: 'position', header: 'Position' },
              { key: 'staffId', header: 'Staff ID' },
              {
                key: 'assignedCounty',
                header: 'County / Sub-county',
                render: (row) => `${row.assignedCounty}${row.assignedSubCounty ? `, ${row.assignedSubCounty}` : ''}`,
              },
            ]}
            data={govtOfficers ?? []}
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
