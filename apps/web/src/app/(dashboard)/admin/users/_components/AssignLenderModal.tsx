'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseCsvRows, looksLikeHeader, downloadCsv } from '../_lib/csv'

interface Partner {
  id: string
  name: string
  type: string
}

interface BulkRowResult {
  identifier: string
  lenderName: string
  status: 'assigned' | 'not_found' | 'not_a_farmer' | 'lender_not_found'
  fullName?: string
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  ngo_grant: 'NGO / Grant',
  cooperative: 'Cooperative / Group',
  bank: 'Bank',
  microfinance: 'Microfinance',
  sacco: 'SACCO',
  mobile_lender: 'Mobile Lender',
}

const ROW_STATUS_LABEL: Record<BulkRowResult['status'], { label: string; bg: string; color: string }> = {
  assigned: { label: 'Assigned', bg: '#EAF4EE', color: '#0D4A28' },
  not_found: { label: 'Farmer not found', bg: '#FEE2E2', color: '#991B1B' },
  not_a_farmer: { label: 'Not a farmer', bg: '#FEF3C7', color: '#92400E' },
  lender_not_found: { label: 'NGO/Group not found', bg: '#FEE2E2', color: '#991B1B' },
}

const IDENTIFIER_HEADERS = ['phone', 'national_id', 'nationalid', 'id_number', 'idnumber']
const LENDER_HEADERS = ['ngo_or_group_name', 'ngo_name', 'lender_name', 'group_name', 'institution']

interface ParsedRow {
  identifier: string
  lenderName: string
}

/**
 * Reads a 1- or 2-column CSV: column 1 is the farmer's phone/National ID,
 * column 2 (optional per row) is the NGO/Group/lender name. Rows missing a
 * lender name fall back to `defaultLenderName` when one is selected.
 */
function parseAssignmentCsv(text: string, defaultLenderName: string): { rows: ParsedRow[]; skipped: number } {
  const raw = parseCsvRows(text)
  if (raw.length === 0) return { rows: [], skipped: 0 }
  const startIdx = looksLikeHeader(raw[0]?.[0] ?? '', IDENTIFIER_HEADERS) || looksLikeHeader(raw[0]?.[1] ?? '', LENDER_HEADERS) ? 1 : 0

  const rows: ParsedRow[] = []
  let skipped = 0
  const seen = new Set<string>()
  for (const cells of raw.slice(startIdx)) {
    const identifier = (cells[0] ?? '').trim()
    const lenderName = (cells[1] ?? '').trim() || defaultLenderName
    if (!identifier || !lenderName) { skipped++; continue }
    const key = `${identifier}::${lenderName}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ identifier, lenderName })
  }
  return { rows, skipped }
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: 10, padding: 20, width: 520,
  maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase',
  letterSpacing: '0.04em', marginBottom: 4, display: 'block',
}

const selectStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px',
  fontSize: 14, color: '#374151', backgroundColor: '#fff', marginBottom: 14,
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
  /** When set, the modal assigns this one farmer. When omitted, it's bulk-CSV mode. */
  farmer?: { id: string; full_name: string }
  onClose: () => void
}

export function AssignLenderModal({ farmer, onClose }: Props) {
  const queryClient = useQueryClient()
  const [lenderId, setLenderId] = useState('')
  const [defaultLenderName, setDefaultLenderName] = useState('')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [skippedCount, setSkippedCount] = useState(0)
  const [results, setResults] = useState<BulkRowResult[] | null>(null)

  const { data: partners, isLoading: partnersLoading } = useQuery({
    queryKey: ['finance', 'partners'],
    queryFn: async () => {
      const res = await fetch('/api/finance/partners')
      if (!res.ok) throw new Error('Failed to load NGOs/Groups')
      const body = (await res.json()) as { data: Partner[] }
      return body.data
    },
  })

  const invalidateUsers = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })

  const singleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/finance/farmers/${farmer?.id}/lender`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lenderId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Failed to assign farmer')
      }
    },
    onSuccess: () => {
      toast.success(`${farmer?.full_name} assigned`)
      invalidateUsers()
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to assign farmer'),
  })

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/finance/farmers/bulk-lender', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        message?: string
        data?: { assignedCount: number; results: BulkRowResult[] }
      }
      if (!res.ok) throw new Error(body.message ?? 'Bulk assignment failed')
      if (!body.data) throw new Error('Unexpected response from server')
      return body.data
    },
    onSuccess: (data) => {
      setResults(data.results)
      invalidateUsers()
      toast.success(`${data.assignedCount} of ${data.results.length} farmer(s) assigned`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Bulk assignment failed'),
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setResults(null)
    if (!f) { setFileName(''); setRows([]); setSkippedCount(0); return }
    setFileName(f.name)
    const text = await f.text()
    const parsed = parseAssignmentCsv(text, defaultLenderName)
    setRows(parsed.rows)
    setSkippedCount(parsed.skipped)
    if (parsed.rows.length === 0) {
      toast.error('No valid rows found — each row needs a phone/National ID and an NGO/Group name (or pick a default above)')
    }
  }

  function downloadTemplate() {
    const exampleName = partners?.find((p) => p.type === 'ngo_grant' || p.type === 'cooperative')?.name ?? partners?.[0]?.name ?? 'Hope Foundation'
    downloadCsv(
      'farmer-ngo-assignment-template.csv',
      ['phone', 'ngo_or_group_name'],
      [
        ['+254712345678', exampleName],
        ['+254798765432', exampleName],
      ],
    )
  }

  const isBulk = !farmer
  const canSubmit = isBulk ? rows.length > 0 : lenderId.length > 0
  const busy = singleMutation.isPending || bulkMutation.isPending

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {isBulk ? 'Bulk Assign Existing Farmers to NGO / Group' : `Assign ${farmer?.full_name}`}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, color: '#6B7280', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {!isBulk && (
          <>
            <label style={labelStyle}>NGO / Group / Lender</label>
            <select value={lenderId} onChange={(e) => setLenderId(e.target.value)} style={selectStyle} disabled={partnersLoading}>
              <option value="">{partnersLoading ? 'Loading…' : 'Select an institution…'}</option>
              {partners?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {PARTNER_TYPE_LABELS[p.type] ?? p.type}
                </option>
              ))}
            </select>
          </>
        )}

        {isBulk && (
          <>
            <label style={labelStyle}>Default NGO / Group (optional — used for rows without their own)</label>
            <select
              value={defaultLenderName}
              onChange={(e) => setDefaultLenderName(e.target.value)}
              style={selectStyle}
              disabled={partnersLoading}
            >
              <option value="">{partnersLoading ? 'Loading…' : 'No default — every row must name its own institution'}</option>
              {partners?.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} — {PARTNER_TYPE_LABELS[p.type] ?? p.type}
                </option>
              ))}
            </select>

            <label style={labelStyle}>Farmers CSV — columns: phone (or National ID), NGO/Group name</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input type="file" accept=".csv,text/csv" onChange={(e) => void handleFileChange(e)} style={{ fontSize: 13 }} />
              <button type="button" onClick={downloadTemplate} style={{ ...secondaryBtn, padding: '5px 8px', fontSize: 12 }}>
                ⬇ Template
              </button>
            </div>
            {fileName && (
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
                {fileName} — {rows.length} row{rows.length === 1 ? '' : 's'} ready
                {skippedCount > 0 && `, ${skippedCount} skipped (missing phone/National ID or NGO name)`}
              </p>
            )}
          </>
        )}

        {results && (
          <div style={{ marginTop: 4, marginBottom: 14, maxHeight: 240, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ backgroundColor: '#F9FAFB', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '5px 8px' }}>Identifier</th>
                  <th style={{ textAlign: 'left', padding: '5px 8px' }}>Farmer</th>
                  <th style={{ textAlign: 'left', padding: '5px 8px' }}>NGO/Group</th>
                  <th style={{ textAlign: 'left', padding: '5px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const s = ROW_STATUS_LABEL[r.status]
                  return (
                    <tr key={`${r.identifier}-${r.lenderName}-${i}`}>
                      <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>{r.identifier}</td>
                      <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>{r.fullName ?? '—'}</td>
                      <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>{r.lenderName}</td>
                      <td style={{ padding: '5px 8px', borderTop: '1px solid #F3F4F6' }}>
                        <span style={{ backgroundColor: s.bg, color: s.color, borderRadius: 8, padding: '2px 6px', fontWeight: 600 }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>
            {results ? 'Close' : 'Cancel'}
          </button>
          {!results && (
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={() => (isBulk ? bulkMutation.mutate() : singleMutation.mutate())}
              style={{ ...primaryBtn, opacity: !canSubmit || busy ? 0.5 : 1, cursor: !canSubmit || busy ? 'not-allowed' : 'pointer' }}
            >
              {busy ? 'Assigning…' : isBulk ? `Assign ${rows.length || ''} Farmer(s)` : 'Assign'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
