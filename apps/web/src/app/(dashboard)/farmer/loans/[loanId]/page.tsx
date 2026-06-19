'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Banknote,
  CalendarDays,
  Building2,
  TrendingUp,
  Smartphone,
  Info,
  Receipt,
} from 'lucide-react'
import { DUMMY_LOANS, calcEMI, fmtKes, LOAN_PRODUCTS } from '../_data/loanProducts'

interface LoanDocument {
  id: string
  name: string
  documentType: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

interface LoanDetail {
  id: string
  farmerId: string
  farmId: string
  type: string
  amountRequestedKes: number
  purpose: string
  repaymentMonths: number
  partnerBankId: string | null
  creditScore: number | null
  creditBand: string | null
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'repaid' | 'defaulted'
  approvedAmountKes: number | null
  interestRatePct: number | null
  disbursedAt: string | null
  mpesaDisbursementRef: string | null
  rejectionReason: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  documents: LoanDocument[]
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  agricultural_working_capital: 'Agricultural Working Capital',
  back_to_school: 'Back to School',
  asset_finance: 'Asset Finance',
  emergency: 'Emergency Loan',
}

const DOC_TYPES = [
  { id: 'national_id', label: 'National ID' },
  { id: 'land_title', label: 'Land Title' },
  { id: 'farm_photo', label: 'Farm Photo' },
  { id: 'bank_statement', label: 'Bank Statement' },
  { id: 'payslip', label: 'Payslip' },
  { id: 'other', label: 'Other Document' },
]

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Submitted', desc: 'Application received by the lender' },
  { key: 'under_review', label: 'Under Review', desc: 'Lender is assessing your credit and farm data' },
  { key: 'approved', label: 'Decision', desc: 'Lender has made a final decision' },
  { key: 'disbursed', label: 'Disbursed', desc: 'Funds sent via M-Pesa' },
  { key: 'repaid', label: 'Repaid', desc: 'Loan fully settled' },
]

const STATUS_ORDER = ['submitted', 'under_review', 'approved', 'disbursed', 'repaid']

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  disbursed: 'bg-purple-100 text-purple-700',
  repaid: 'bg-green-100 text-green-700',
  defaulted: 'bg-red-100 text-red-800',
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

async function uploadFileFallback(
  file: File,
  loanId: string,
): Promise<{ key: string; mimeType: string; sizeBytes: number }> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'govt-documents')
    formData.append('entity_id', loanId)
    const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
    if (res.ok) {
      const { data } = await res.json()
      return { key: data.key, mimeType: data.mime_type, sizeBytes: data.size_bytes }
    }
  } catch { /* fallthrough */ }
  return {
    key: `dev-uploads/loan-docs/${loanId}/${Date.now()}-${file.name}`,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  }
}

function StatusTimeline({ status }: { status: string }) {
  const isRejected = status === 'rejected' || status === 'defaulted'
  const currentIdx = isRejected
    ? STATUS_ORDER.indexOf('approved')
    : STATUS_ORDER.indexOf(status)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Application Progress</h3>
      <div className="relative">
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-100" />
        <div className="space-y-5">
          {TIMELINE_STEPS.map((step, i) => {
            const done = i < currentIdx
            const current = i === currentIdx
            const isFinal = step.key === 'approved'
            const isDecisionRejected = isRejected && isFinal && current

            return (
              <div key={step.key} className="flex gap-4 relative">
                <div className="relative z-10 flex-shrink-0 mt-0.5 bg-white">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : current && isDecisionRejected ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : current ? (
                    <div className="h-5 w-5 rounded-full border-2 border-blue-500 bg-blue-100 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-gray-200" />
                  )}
                </div>
                <div className={`pb-1 transition-opacity ${!done && !current ? 'opacity-40' : ''}`}>
                  <p className={`text-sm font-semibold ${
                    isDecisionRejected ? 'text-red-600'
                    : current ? 'text-gray-900'
                    : done ? 'text-gray-700'
                    : 'text-gray-400'
                  }`}>
                    {isDecisionRejected ? 'Application Rejected' : step.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    isDecisionRejected ? 'text-red-400'
                    : current ? 'text-blue-500'
                    : done ? 'text-gray-400'
                    : 'text-gray-300'
                  }`}>
                    {isDecisionRejected ? 'Your application was not approved at this time' : step.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function UploadModal({ loanId, onClose }: { loanId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('national_id')
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!file || !docName) return
    setUploading(true)
    try {
      const media = await uploadFileFallback(file, loanId)
      const metaRes = await fetch(`/api/finance/loans/${loanId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docName,
          documentType: docType,
          storageKey: media.key,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
        }),
      })
      if (!metaRes.ok && metaRes.status !== 201) throw new Error('Failed to save document')
      qc.invalidateQueries({ queryKey: ['loan', loanId] })
      toast.success('Document uploaded')
      onClose()
    } catch {
      toast.error('Upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-1 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Upload Document</h3>
          <p className="text-xs text-gray-400 mt-0.5">Add a supporting document to your loan application</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Document name *</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. National ID – Front"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Document type *</label>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDocType(t.id)}
                  className={`text-xs text-left px-3 py-2 rounded-lg border transition-all ${
                    docType === t.id ? 'border-green-600 bg-green-50 text-green-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 rounded-xl p-4 text-center cursor-pointer transition-all ${
                file ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-200 hover:border-green-400 hover:bg-gray-50'
              }`}
            >
              {file ? (
                <div className="flex items-center gap-2 justify-center">
                  {file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-green-600" />}
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{fmtBytes(file.size)}</span>
                </div>
              ) : (
                <div>
                  <Upload className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
                  <p className="text-sm text-gray-400">Click to select file</p>
                  <p className="text-xs text-gray-300 mt-0.5">JPEG, PNG or PDF · Max 10 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { setFile(f); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '')) }
              }}
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} disabled={uploading} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleUpload} disabled={!file || !docName || uploading}
            className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentRow({ doc, loanId, canDelete }: { doc: LoanDocument; loanId: string; canDelete: boolean }) {
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/finance/loans/${loanId}/documents/${doc.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Delete failed')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan', loanId] }); toast.success('Document removed') },
    onError: () => toast.error('Could not delete document'),
  })

  const isImage = doc.mimeType.startsWith('image/')
  const Icon = isImage ? ImageIcon : FileText
  const typeLabel = DOC_TYPES.find((t) => t.id === doc.documentType)?.label ?? doc.documentType

  return (
    <div className="flex items-center justify-between py-3.5 px-5 hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isImage ? 'bg-blue-100' : 'bg-orange-100'}`}>
          <Icon className={`h-4 w-4 ${isImage ? 'text-blue-600' : 'text-orange-600'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {typeLabel} · {fmtBytes(doc.sizeBytes)} · {new Date(doc.uploadedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      {canDelete && (
        <button onClick={() => del.mutate()} disabled={del.isPending}
          className="opacity-0 group-hover:opacity-100 ml-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
        >
          {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}

export default function LoanDetailPage({ params }: { params: { loanId: string } }) {
  const { loanId } = params
  const [showUpload, setShowUpload] = useState(false)

  const { data: loan, isLoading, isError } = useQuery<LoanDetail>({
    queryKey: ['loan', loanId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/finance/loans/${loanId}`)
        if (res.ok) return (await res.json()).data
      } catch { /* fallthrough to dummy */ }
      // Fallback: look up in dummy loans
      const dummy = DUMMY_LOANS.find((l) => l.id === loanId)
      if (dummy) return dummy as unknown as LoanDetail
      throw new Error('Loan not found')
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-gray-200 rounded-xl" />
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 bg-gray-200 rounded-xl" />
            <div className="h-56 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !loan) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="h-12 w-12 text-red-300" />
        <h2 className="text-lg font-bold text-gray-700">Loan not found</h2>
        <Link href="/farmer/loans" className="text-sm text-green-700 hover:underline">← Back to Loans</Link>
      </div>
    )
  }

  const canUpload = ['submitted', 'under_review'].includes(loan.status)
  const canDelete = ['submitted', 'under_review'].includes(loan.status)
  const isActive = !['repaid', 'rejected', 'defaulted'].includes(loan.status)

  const emi = loan.approvedAmountKes && loan.interestRatePct
    ? calcEMI(Number(loan.approvedAmountKes), Number(loan.interestRatePct), loan.repaymentMonths)
    : null

  const linkedProduct = LOAN_PRODUCTS.find((p) => p.institution.id === loan.partnerBankId)

  return (
    <div className="min-h-screen bg-gray-50">
      {showUpload && <UploadModal loanId={loanId} onClose={() => setShowUpload(false)} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/farmer/loans" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">
                {LOAN_TYPE_LABELS[loan.type] ?? loan.type}
              </h1>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[loan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {loan.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Applied {new Date(loan.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
              {linkedProduct && <> · {linkedProduct.institution.name}</>}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Timeline */}
          <div className="space-y-4">
            <StatusTimeline status={loan.status} />

            {/* Quick stats */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {[
                { Icon: Banknote, label: 'Requested', value: fmtKes(loan.amountRequestedKes), color: 'text-gray-900' },
                { Icon: CalendarDays, label: 'Repayment', value: `${loan.repaymentMonths} months`, color: 'text-gray-900' },
                ...(loan.creditScore != null ? [{ Icon: TrendingUp, label: 'Credit Score', value: `${Number(loan.creditScore).toFixed(0)}/100 · Band ${loan.creditBand}`, color: 'text-blue-700' }] : []),
                ...(linkedProduct ? [{ Icon: Building2, label: 'Lender', value: linkedProduct.institution.name, color: 'text-gray-700' }] : []),
              ].map(({ Icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400">{label}</p>
                    <p className={`text-sm font-semibold truncate ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Purpose */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Loan Purpose</p>
              <p className="text-sm text-gray-700 leading-relaxed">{loan.purpose}</p>
            </div>

            {/* Approved terms */}
            {(loan.status === 'approved' || loan.status === 'disbursed' || loan.status === 'repaid') && loan.approvedAmountKes && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-semibold">Approved Loan Terms</span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-emerald-600">Approved Amount</p>
                      <p className="text-xl font-black text-emerald-900">{fmtKes(Number(loan.approvedAmountKes))}</p>
                    </div>
                    {loan.interestRatePct && (
                      <div>
                        <p className="text-xs text-emerald-600">Interest Rate</p>
                        <p className="text-xl font-black text-emerald-900">{Number(loan.interestRatePct)}%<span className="text-sm font-medium"> p.a.</span></p>
                      </div>
                    )}
                    {emi && (
                      <div>
                        <p className="text-xs text-emerald-600">Monthly Payment</p>
                        <p className="text-xl font-black text-emerald-900">{fmtKes(emi)}</p>
                      </div>
                    )}
                  </div>

                  {emi && (
                    <div className="bg-white/70 rounded-xl p-3 grid grid-cols-3 gap-3 text-center mb-4">
                      {[
                        ['Total Repayment', fmtKes(emi * loan.repaymentMonths)],
                        ['Total Interest', fmtKes(emi * loan.repaymentMonths - Number(loan.approvedAmountKes))],
                        ['Remaining Months', String(loan.repaymentMonths)],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <p className="text-[10px] text-emerald-600">{l}</p>
                          <p className="text-sm font-bold text-emerald-900">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {(loan.status === 'disbursed' || loan.status === 'repaid') && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5" /> M-Pesa Disbursement
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {loan.disbursedAt && (
                          <div>
                            <p className="text-purple-500">Disbursed on</p>
                            <p className="font-bold text-purple-900">
                              {new Date(loan.disbursedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                        {loan.mpesaDisbursementRef && (
                          <div>
                            <p className="text-purple-500 flex items-center gap-1"><Receipt className="h-3 w-3" /> M-Pesa Ref</p>
                            <p className="font-mono font-bold text-purple-900 text-base">{loan.mpesaDisbursementRef}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rejection */}
            {(loan.status === 'rejected' || loan.status === 'defaulted') && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800 mb-1">Application Not Approved</p>
                    {loan.rejectionReason && <p className="text-sm text-red-700">{loan.rejectionReason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-red-200">
                  <Info className="h-3.5 w-3.5 text-red-400" />
                  <p className="text-xs text-red-500">
                    You can apply again after improving your farm records.
                  </p>
                  <Link href="/farmer/loans" className="text-xs text-red-700 font-semibold underline ml-auto">
                    Browse Loans →
                  </Link>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Supporting Documents</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {loan.documents.length === 0
                      ? 'No documents attached'
                      : `${loan.documents.length} document${loan.documents.length !== 1 ? 's' : ''} attached`}
                  </p>
                </div>
                {canUpload && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" /> Add Document
                  </button>
                )}
              </div>

              {loan.documents.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center px-6">
                  <FileText className="h-10 w-10 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-400 mb-1">No documents uploaded</p>
                  {canUpload ? (
                    <p className="text-xs text-gray-400">
                      Add supporting documents to help the lender assess your application faster.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Documents can only be added while the application is under review.</p>
                  )}
                  {canUpload && (
                    <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-green-700 font-medium hover:underline">
                      Upload first document
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {loan.documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} loanId={loanId} canDelete={canDelete} />
                  ))}
                </div>
              )}

              {!canUpload && isActive && (
                <p className="text-xs text-gray-400 px-5 py-3 border-t border-gray-100 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Document uploads are closed after the lender makes a decision.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
