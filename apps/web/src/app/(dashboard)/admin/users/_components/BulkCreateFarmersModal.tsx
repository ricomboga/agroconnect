'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties'
import { parseCsvRows, looksLikeHeader, downloadCsv } from '../_lib/csv'

interface Partner {
  id: string
  name: string
  type: string
}

// Matches auth-service's admin createUserSchema exactly — keeping the two
// aligned is what avoids "works in the template but 400s on upload" errors.
const PHONE_RE = /^\+2547\d{8}$|^\+2541\d{8}$/
const COUNTY_BY_LOWER = new Map(KENYA_COUNTIES.map((c) => [c.toLowerCase(), c]))
const DEFAULT_PASSWORD = 'Agro1234' // matches the existing single-farmer wizard's default

const HEADER_ROW = ['full_name', 'phone', 'national_id', 'county', 'sub_county', 'language', 'ngo_or_group_name']

type RowStatus = 'pending' | 'created' | 'create_failed' | 'assigned' | 'assign_failed' | 'skipped_no_ngo'

interface NewFarmerRow {
  fullName: string
  phone: string
  idNumber?: string
  county?: string
  subCounty?: string
  language?: 'sw' | 'en'
  ngoName?: string
  status: RowStatus
  error?: string
}

function parseNewFarmersCsv(text: string): { rows: NewFarmerRow[]; invalidCount: number } {
  const raw = parseCsvRows(text)
  if (raw.length === 0) return { rows: [], invalidCount: 0 }
  const startIdx = looksLikeHeader(raw[0]?.[0] ?? '', ['full_name', 'fullname', 'name']) ? 1 : 0

  const rows: NewFarmerRow[] = []
  let invalidCount = 0
  for (const cells of raw.slice(startIdx)) {
    const [fullName, phone, idNumber, countyRaw, subCounty, languageRaw, ngoName] = cells.map((c) => c?.trim() ?? '')
    if (!fullName || !phone || !PHONE_RE.test(phone)) { invalidCount++; continue }
    const county = countyRaw ? COUNTY_BY_LOWER.get(countyRaw.toLowerCase()) : undefined
    if (countyRaw && !county) { invalidCount++; continue }
    const language = languageRaw?.toLowerCase() === 'en' ? 'en' : languageRaw?.toLowerCase() === 'sw' ? 'sw' : undefined
    rows.push({
      fullName,
      phone,
      idNumber: idNumber || undefined,
      county,
      subCounty: subCounty || undefined,
      language,
      ngoName: ngoName || undefined,
      status: 'pending',
    })
  }
  return { rows, invalidCount }
}

const STATUS_LABEL: Record<RowStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending…', bg: '#F3F4F6', color: '#374151' },
  created: { label: 'Created', bg: '#EAF4EE', color: '#0D4A28' },
  create_failed: { label: 'Failed', bg: '#FEE2E2', color: '#991B1B' },
  assigned: { label: 'Created & Assigned', bg: '#EAF4EE', color: '#0D4A28' },
  assign_failed: { label: 'Created, assign failed', bg: '#FEF3C7', color: '#92400E' },
  skipped_no_ngo: { label: 'Created (no NGO given)', bg: '#EAF4EE', color: '#0D4A28' },
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: 10, padding: 20, width: 640,
  maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase',
  letterSpacing: '0.04em', marginBottom: 4, display: 'block',
}

const primaryBtn: React.CSSProperties = {
  backgroundColor: '#1A6B3C', color: '#fff', border: 'none', borderRadius: 6,
  padding: '9px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  backgroundColor: 'transparent', color: '#374151', border: '1px solid #E5E7EB',
  borderRadius: 6, padding: '9px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

interface Props {
  onClose: () => void
}

export function BulkCreateFarmersModal({ onClose }: Props) {
  const queryClient = useQueryClient()
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<NewFarmerRow[]>([])
  const [invalidCount, setInvalidCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const { data: partners } = useQuery({
    queryKey: ['finance', 'partners'],
    queryFn: async () => {
      const res = await fetch('/api/finance/partners')
      if (!res.ok) throw new Error('Failed to load NGOs/Groups')
      const body = (await res.json()) as { data: Partner[] }
      return body.data
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setDone(false)
    if (!f) { setFileName(''); setRows([]); setInvalidCount(0); return }
    setFileName(f.name)
    const text = await f.text()
    const parsed = parseNewFarmersCsv(text)
    setRows(parsed.rows)
    setInvalidCount(parsed.invalidCount)
    if (parsed.rows.length === 0) {
      toast.error('No valid rows found — each row needs at least a full name and a valid +254 phone number')
    }
  }

  function downloadTemplate() {
    const exampleName = partners?.find((p) => p.type === 'ngo_grant' || p.type === 'cooperative')?.name ?? partners?.[0]?.name ?? 'Hope Foundation'
    downloadCsv('new-farmer-onboarding-template.csv', HEADER_ROW, [
      ['Jane Wanjiru', '+254712345678', '12345678', 'Nakuru', 'Nakuru Town East', 'sw', exampleName],
      ['John Otieno', '+254798765432', '', 'Kisumu', '', 'en', ''],
    ])
  }

  async function handleSubmit() {
    setSubmitting(true)
    const working = rows.map((r) => ({ ...r }))
    setRows(working)

    for (let i = 0; i < working.length; i++) {
      const row = working[i]
      if (!row) continue
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: row.phone,
            password: DEFAULT_PASSWORD,
            fullName: row.fullName,
            role: 'farmer',
            county: row.county,
            subCounty: row.subCounty,
            language: row.language,
            idNumber: row.idNumber,
          }),
        })
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        row.status = res.ok ? (row.ngoName ? 'created' : 'skipped_no_ngo') : 'create_failed'
        if (!res.ok) row.error = body.message ?? 'Failed to create account'
      } catch {
        row.status = 'create_failed'
        row.error = 'Network error'
      }
      setRows([...working])
    }

    const toAssign = working.filter((r) => r.status === 'created' && r.ngoName)
    if (toAssign.length > 0) {
      try {
        const res = await fetch('/api/finance/farmers/bulk-lender', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: toAssign.map((r) => ({ identifier: r.phone, lenderName: r.ngoName })),
          }),
        })
        const body = (await res.json().catch(() => ({}))) as {
          data?: { results: { identifier: string; status: string }[] }
        }
        const byPhone = new Map((body.data?.results ?? []).map((r) => [r.identifier, r.status]))
        for (const row of working) {
          if (row.status !== 'created') continue
          row.status = byPhone.get(row.phone) === 'assigned' ? 'assigned' : 'assign_failed'
        }
      } catch {
        for (const row of working) if (row.status === 'created') row.status = 'assign_failed'
      }
      setRows([...working])
    }

    const createdCount = working.filter((r) => r.status !== 'create_failed').length
    toast.success(`${createdCount} of ${working.length} farmer(s) onboarded`)
    setSubmitting(false)
    setDone(true)
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
  }

  return (
    <div style={overlayStyle} onClick={submitting ? undefined : onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Onboard New Farmers (CSV)</span>
          {!submitting && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#6B7280', cursor: 'pointer', lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
          For farmers who don&apos;t have an account yet. Columns: <code>full_name</code>, <code>phone</code>,{' '}
          <code>national_id</code> (optional), <code>county</code> (optional), <code>sub_county</code> (optional),{' '}
          <code>language</code> (sw/en, optional), <code>ngo_or_group_name</code> (optional — assigns the new account
          right after creation).
        </p>

        <label style={labelStyle}>Farmers CSV</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <input type="file" accept=".csv,text/csv" onChange={(e) => void handleFileChange(e)} disabled={submitting} style={{ fontSize: 13 }} />
          <button type="button" onClick={downloadTemplate} style={{ ...secondaryBtn, padding: '5px 8px', fontSize: 12 }}>
            ⬇ Template
          </button>
        </div>
        {fileName && (
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
            {fileName} — {rows.length} row{rows.length === 1 ? '' : 's'} ready
            {invalidCount > 0 && `, ${invalidCount} skipped (missing name/valid +254 phone, or unrecognised county)`}
          </p>
        )}

        {rows.length > 0 && (
          <>
            <div style={{
              backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 6, padding: '8px 10px',
              fontSize: 12, marginBottom: 12,
            }}>
              New accounts are created with the default password <strong>{DEFAULT_PASSWORD}</strong> — share this
              with each farmer and ask them to change it after their first login.
            </div>

            <div style={{ marginBottom: 14, maxHeight: 260, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ backgroundColor: '#F9FAFB', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '5px 8px' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '5px 8px' }}>Phone</th>
                    <th style={{ textAlign: 'left', padding: '5px 8px' }}>County</th>
                    <th style={{ textAlign: 'left', padding: '5px 8px' }}>NGO/Group</th>
                    <th style={{ textAlign: 'left', padding: '5px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const s = STATUS_LABEL[r.status]
                    return (
                      <tr key={r.phone}>
                        <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>{r.fullName}</td>
                        <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>{r.phone}</td>
                        <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>{r.county ?? '—'}</td>
                        <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>{r.ngoName ?? '—'}</td>
                        <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>
                          <span style={{ backgroundColor: s.bg, color: s.color, borderRadius: 8, padding: '2px 6px', fontWeight: 600 }} title={r.error}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ ...secondaryBtn, opacity: submitting ? 0.5 : 1 }}>
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button
              type="button"
              disabled={rows.length === 0 || submitting}
              onClick={() => void handleSubmit()}
              style={{ ...primaryBtn, opacity: rows.length === 0 || submitting ? 0.5 : 1, cursor: rows.length === 0 || submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Onboarding…' : `Onboard ${rows.length || ''} Farmer(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
