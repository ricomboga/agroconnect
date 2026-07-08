'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormSection, Field, FieldGroup, Select, ChipSelect } from '@agroconnect/web-ui'

interface CountySummary {
  county: string | null
  registered_farms: number
  subsidies_issued: number
  pending_registrations: number
  pending_subsidy_applications: number
  pending_license_applications: number
  total_pending_review: number
}

const KENYA_COUNTIES = [
  'All Counties', 'Nakuru', 'Meru', 'Uasin Gishu', 'Nairobi', 'Mombasa', 'Kisumu', 'Kiambu',
] as const

const PERIODS = ['Q2 2025 (Apr–Jun)', 'Q1 2025', 'Full Year 2025'] as const

const REPORT_TYPES = [
  'Full Agricultural Report',
  'Subsidy Distribution Report',
  'Farm Registration Report',
  'Crop Production Report',
] as const

// TODO(real-data): "Top Crop Challenges" needs a farm-service↔govt-service AI-diagnosis-stats
// endpoint that does not exist yet — cross-service and explicitly out of scope for this pass.
const TOP_CROP_CHALLENGES = [
  { label: 'Grey Leaf Spot (Maize)', count: 342, color: 'text-ac-red' },
  { label: 'Newcastle Disease (Poultry)', count: 187, color: 'text-ac-amber' },
  { label: 'Late Blight (Tomato)', count: 124, color: 'text-ac-amber' },
] as const

export function ReportsContent() {
  const [county, setCounty] = useState<string>('Nakuru')
  const [period, setPeriod] = useState<string>(PERIODS[0])
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0])
  const [exportFormats, setExportFormats] = useState<string[]>(['excel', 'pdf'])
  const [appliedCounty, setAppliedCounty] = useState<string>('Nakuru')

  const { data: summary, isFetching } = useQuery({
    queryKey: ['govt', 'reports', 'county-summary', appliedCounty],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (appliedCounty && appliedCounty !== 'All Counties') params.set('county', appliedCounty)
      const res = await fetch(`/api/govt/reports/county-summary?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load county summary')
      const body = (await res.json()) as { data: CountySummary }
      return body.data
    },
  })

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setAppliedCounty(county)
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-lg font-bold text-ink">County Agricultural Reports</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-base border border-border bg-white px-4 py-3">
          <p className="mb-2 text-md font-semibold text-ink">Generate Report</p>
          <form onSubmit={handleGenerate}>
            <FieldGroup cols={2}>
              <Field label="County">
                <Select value={county} onChange={(e) => setCounty(e.target.value)}>
                  {KENYA_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Reporting Period">
                <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldGroup>
            <Field label="Report Type">
              <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Export Format">
              <ChipSelect
                multiple
                options={[
                  { value: 'excel', label: '📊 Excel' },
                  { value: 'pdf', label: '📄 PDF' },
                  { value: 'email', label: '📧 Email HQ' },
                ]}
                value={exportFormats}
                onChange={setExportFormats}
              />
            </Field>
            <button
              type="submit"
              className="mt-3 w-full rounded-md bg-ac-green px-3 py-2.5 text-center text-base font-semibold text-white"
            >
              {isFetching ? 'Loading…' : 'Generate Report'}
            </button>
          </form>
        </div>

        <div className="rounded-base border border-border bg-white px-4 py-3">
          <p className="mb-2 text-md font-semibold text-ink">
            {appliedCounty} County Summary, {period}
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-base bg-ac-green-light p-2.5 text-center">
              <div className="text-2xl font-bold text-ac-green">
                {(summary?.registered_farms ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted">Registered Farms</div>
            </div>
            <div className="rounded-base bg-ac-green-light p-2.5 text-center">
              <div className="text-2xl font-bold text-ac-green">
                {(summary?.total_pending_review ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted">Pending Review (All)</div>
            </div>
            <div className="rounded-base bg-ac-amber-light p-2.5 text-center">
              <div className="text-2xl font-bold text-ac-amber">
                {(summary?.subsidies_issued ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted">Subsidies Issued</div>
            </div>
            <div className="rounded-base bg-ac-blue-light p-2.5 text-center">
              <div className="text-2xl font-bold text-ac-blue">
                {(summary?.pending_subsidy_applications ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted">Pending Subsidy Apps</div>
            </div>
          </div>

          <p className="mb-1.5 text-sm font-bold uppercase tracking-wide text-ac-green">
            Top Crop Challenges (AI Diagnoses)
          </p>
          <div className="flex flex-col gap-1">
            {/* TODO(real-data): needs a farm-service↔govt-service diagnosis-stats endpoint */}
            {TOP_CROP_CHALLENGES.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-base">
                <span>{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.count} cases</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
