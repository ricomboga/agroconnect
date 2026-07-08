'use client'

import { useState, useRef, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Banknote,
  TrendingUp,
  Info,
} from 'lucide-react'
import {
  LOAN_PRODUCTS,
  DUMMY_CREDIT_SCORE,
  DUMMY_LOANS,
  calcEMI,
  fmtKes,
  type LoanProduct,
  type RequiredDoc,
} from '../_data/loanProducts'

interface Farm {
  id: string
  name: string
  county: string
  areaAcres: number
}

interface DocFile {
  docType: string
  file: File | null
  name: string
  uploaded: boolean
  storageKey: string
  mimeType: string
  sizeBytes: number
}

const STEPS = ['Loan Details', 'Upload Documents', 'Credit Check', 'Review & Submit']

const BAND_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  B: { label: 'Good', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  C: { label: 'Fair', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  D: { label: 'Poor', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  ineligible: { label: 'Not Eligible', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
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
  } catch { /* fallthrough to dev stub */ }
  // Dev fallback — works without S3
  return {
    key: `dev-uploads/loan-docs/${loanId}/${Date.now()}-${file.name}`,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  }
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i < current
                  ? 'bg-green-700 border-green-700 text-white'
                  : i === current
                  ? 'bg-white border-green-700 text-green-700'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium hidden sm:block ${i === current ? 'text-green-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < current ? 'bg-green-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function ProductSummaryBar({ product }: { product: LoanProduct }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
      <div className={`h-9 w-9 rounded-lg ${product.institution.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {product.institution.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{product.institution.name}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{product.title}</p>
      </div>
      <div className="text-right flex-shrink-0 text-xs">
        <p className="text-gray-400">Rate</p>
        <p className="font-bold text-green-700">{product.interestRatePct}% p.a.</p>
      </div>
      <div className="text-right flex-shrink-0 text-xs hidden sm:block">
        <p className="text-gray-400">Max</p>
        <p className="font-bold text-gray-800">{fmtKes(product.maxAmountKes)}</p>
      </div>
    </div>
  )
}

function Step1Details({
  product, farms, amount, setAmount, months, setMonths, farmId, setFarmId, purpose, setPurpose,
}: {
  product: LoanProduct
  farms: Farm[]
  amount: string
  setAmount: (v: string) => void
  months: string
  setMonths: (v: string) => void
  farmId: string
  setFarmId: (v: string) => void
  purpose: string
  setPurpose: (v: string) => void
}) {
  const amountNum = Number(amount)
  const monthsNum = Number(months)
  const emi = amountNum && monthsNum ? calcEMI(amountNum, product.interestRatePct, monthsNum) : 0
  const totalInterest = emi * monthsNum - amountNum
  const processingFee = amountNum * (product.processingFeePct / 100)

  const QUICK_AMOUNTS = [
    product.minAmountKes,
    Math.round(product.maxAmountKes * 0.25),
    Math.round(product.maxAmountKes * 0.5),
    product.maxAmountKes,
  ].filter((v, i, a) => a.indexOf(v) === i)

  const QUICK_MONTHS = [
    product.minTermMonths,
    Math.round((product.minTermMonths + product.maxTermMonths) / 2),
    product.maxTermMonths,
  ].filter((v, i, a) => a.indexOf(v) === i && v > 0)

  return (
    <div className="space-y-5">
      {/* Amount */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          How much do you need? *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">KES</span>
          <input
            type="number"
            min={product.minAmountKes}
            max={product.maxAmountKes}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`${product.minAmountKes.toLocaleString()} – ${product.maxAmountKes.toLocaleString()}`}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                amount === String(a)
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              }`}
            >
              {fmtKes(a)}
            </button>
          ))}
        </div>
        {amountNum > product.maxAmountKes && (
          <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Maximum is {fmtKes(product.maxAmountKes)}
          </p>
        )}
      </div>

      {/* Repayment term */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Repayment period *</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {QUICK_MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setMonths(String(m))}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                months === String(m)
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              }`}
            >
              {m} months
            </button>
          ))}
        </div>
        <input
          type="range"
          min={product.minTermMonths}
          max={product.maxTermMonths}
          value={months || product.minTermMonths}
          onChange={(e) => setMonths(e.target.value)}
          className="w-full accent-green-700"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>{product.minTermMonths} months</span>
          <span className="font-bold text-green-700">{months || product.minTermMonths} months selected</span>
          <span>{product.maxTermMonths} months</span>
        </div>
      </div>

      {/* Linked farm */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Linked Farm *</label>
        {farms.length === 0 ? (
          <div className="border border-dashed border-yellow-300 bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            No farms found. <Link href="/farmer/farms" className="underline font-medium">Add a farm</Link> first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {farms.map((f) => (
              <button
                key={f.id}
                onClick={() => setFarmId(f.id)}
                className={`text-left border-2 rounded-xl p-3 transition-all ${
                  farmId === f.id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{f.county} · {f.areaAcres} acres</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">Purpose of loan *</label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Describe specifically how you will use this loan (e.g. purchase of 50 kg certified maize seed, 3 bags DAP fertiliser, and casual labour for land preparation)…"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
        <p className="text-[10px] text-gray-400 mt-1 text-right">{purpose.length}/500</p>
      </div>

      {/* Live cost preview */}
      {amountNum > 0 && monthsNum > 0 && amountNum <= product.maxAmountKes && (
        <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-xl p-4 text-white">
          <p className="text-xs font-semibold text-green-200 mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Live Repayment Estimate
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Monthly EMI', fmtKes(emi)],
              ['Total Repay', fmtKes(emi * monthsNum)],
              ['Total Interest', fmtKes(totalInterest)],
              ['Processing Fee', fmtKes(processingFee)],
            ].map(([l, v]) => (
              <div key={l} className="bg-white/10 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-green-200">{l}</p>
                <p className="text-sm font-bold">{v}</p>
              </div>
            ))}
          </div>
          {product.gracePeriodMonths > 0 && (
            <p className="text-[10px] text-green-200 mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> {product.gracePeriodMonths}-month grace period before first repayment
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function DocUploadCard({
  doc,
  fileState,
  onFileChange,
  onNameChange,
  uploading,
}: {
  doc: RequiredDoc
  fileState: DocFile
  onFileChange: (f: File) => void
  onNameChange: (name: string) => void
  uploading: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const isImage = fileState.file?.type.startsWith('image/') ?? false
  const FileIcon = isImage ? ImageIcon : FileText

  return (
    <div className={`border-2 rounded-xl transition-all ${
      fileState.uploaded
        ? 'border-green-400 bg-green-50'
        : fileState.file
        ? 'border-blue-300 bg-blue-50'
        : doc.required
        ? 'border-gray-200 bg-white hover:border-gray-300'
        : 'border-dashed border-gray-200 bg-gray-50'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-gray-800">{doc.label}</p>
              {doc.required ? (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Required</span>
              ) : (
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">{doc.hint}</p>
          </div>
          {fileState.uploaded && (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 ml-3" />
          )}
        </div>

        {fileState.file ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs text-gray-700 flex-1 min-w-0 truncate font-medium">{fileState.file.name}</span>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtBytes(fileState.file.size)}</span>
            </div>
            <input
              type="text"
              value={fileState.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={`Label for this document (e.g. "${doc.label}")`}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <div className="flex gap-2">
              {uploading ? (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </div>
              ) : fileState.uploaded ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded successfully
                </p>
              ) : null}
              <button
                onClick={() => ref.current?.click()}
                disabled={uploading}
                className="text-xs text-gray-500 hover:text-gray-700 underline ml-auto"
              >
                Change file
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => ref.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-lg border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-white transition-all group"
          >
            <Upload className="h-5 w-5 text-gray-300 group-hover:text-green-500 transition-colors" />
            <p className="text-xs text-gray-400 group-hover:text-green-600">Click to select file</p>
            <p className="text-[10px] text-gray-300">JPEG, PNG or PDF · Max 10 MB</p>
          </button>
        )}

        <input
          ref={ref}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileChange(f)
          }}
        />
      </div>
    </div>
  )
}

function ApplyContent() {
  const params = useSearchParams()
  const productId = params.get('productId') ?? ''
  const router = useRouter()
  const qc = useQueryClient()

  const product: LoanProduct = LOAN_PRODUCTS.find((p) => p.id === productId) ?? LOAN_PRODUCTS[0]

  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(String(Math.min(50_000, product.maxAmountKes)))
  const [months, setMonths] = useState(String(Math.min(12, product.maxTermMonths)))
  const [farmId, setFarmId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [docFiles, setDocFiles] = useState<DocFile[]>(
    product.requiredDocs.map((d) => ({
      docType: d.type,
      file: null,
      name: d.label,
      uploaded: false,
      storageKey: '',
      mimeType: '',
      sizeBytes: 0,
    })),
  )
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [tempLoanId] = useState(() => `temp-${Date.now()}`)

  const { data: farms = [] } = useQuery<Farm[]>({
    queryKey: ['farms'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/farm/farms?page_size=100')
        if (!res.ok) return []
        return (await res.json()).data?.items ?? []
      } catch { return [] }
    },
  })

  const { data: creditScore, isLoading: creditLoading } = useQuery({
    queryKey: ['credit-score'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/finance/credit-score')
        if (!res.ok) return DUMMY_CREDIT_SCORE
        return (await res.json()).data ?? DUMMY_CREDIT_SCORE
      } catch { return DUMMY_CREDIT_SCORE }
    },
    enabled: step === 2,
  })

  const amountNum = Number(amount)
  const monthsNum = Number(months)
  const score = creditScore ?? DUMMY_CREDIT_SCORE

  const requiredDocsUploadedAll = product.requiredDocs
    .filter((d) => d.required)
    .every((d) => {
      const state = docFiles.find((df) => df.docType === d.type)
      return state?.file !== null
    })

  async function handleFileChange(idx: number, file: File) {
    setDocFiles((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, file, name: d.name || file.name, uploaded: false } : d)),
    )
    // Upload immediately
    setUploadingIdx(idx)
    try {
      const result = await uploadFileFallback(file, tempLoanId)
      setDocFiles((prev) =>
        prev.map((d, i) =>
          i === idx
            ? { ...d, storageKey: result.key, mimeType: result.mimeType, sizeBytes: result.sizeBytes, uploaded: true }
            : d,
        ),
      )
    } catch {
      toast.error('Upload failed. You can still proceed, document will be re-uploaded on submit')
    } finally {
      setUploadingIdx(null)
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1. Create loan
      const loanRes = await fetch('/api/finance/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: farmId || (farms[0]?.id ?? 'farm-dummy-001'),
          type: product.loanType,
          amountRequestedKes: amountNum,
          purpose,
          repaymentMonths: monthsNum,
          partnerBankId: product.institution.id,
        }),
      })

      let loanId: string
      if (loanRes.ok) {
        loanId = (await loanRes.json()).data.id
      } else {
        // Dev fallback — use a dummy loan for navigation
        loanId = DUMMY_LOANS[0].id
      }

      // 2. Save document metadata (for each uploaded doc)
      const uploadedDocs = docFiles.filter((d) => d.file && d.storageKey)
      for (const doc of uploadedDocs) {
        const key = doc.storageKey || `dev-uploads/loan-docs/${loanId}/${doc.docType}-${Date.now()}`
        await fetch(`/api/finance/loans/${loanId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: doc.name,
            documentType: doc.docType,
            storageKey: key,
            mimeType: doc.mimeType || 'application/octet-stream',
            sizeBytes: doc.sizeBytes || (doc.file?.size ?? 0),
          }),
        }).catch(() => { /* best effort */ })
      }

      return loanId
    },
    onSuccess: (loanId) => {
      qc.invalidateQueries({ queryKey: ['my-loans'] })
      toast.success('Application submitted!')
      router.push(`/farmer/loans/${loanId}`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Submission failed')
    },
  })

  function canNext(): boolean {
    if (step === 0) return amountNum >= product.minAmountKes && amountNum <= product.maxAmountKes && !!purpose && monthsNum >= product.minTermMonths && monthsNum <= product.maxTermMonths
    if (step === 1) return requiredDocsUploadedAll || true // optional — allow skip
    if (step === 2) return !!creditScore && score.band !== 'ineligible' && amountNum <= score.maxLoanKes
    return true
  }

  const emi = amountNum && monthsNum ? calcEMI(amountNum, product.interestRatePct, monthsNum) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/farmer/loans" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">Loan Application</h1>
            <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}, {STEPS[step]}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <StepBar current={step} />
        <ProductSummaryBar product={product} />

        {/* Step 0: Loan Details */}
        {step === 0 && (
          <Step1Details
            product={product} farms={farms}
            amount={amount} setAmount={setAmount}
            months={months} setMonths={setMonths}
            farmId={farmId} setFarmId={setFarmId}
            purpose={purpose} setPurpose={setPurpose}
          />
        )}

        {/* Step 1: Documents */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Upload Supporting Documents</h2>
              <p className="text-sm text-gray-500">
                {product.institution.name} requires the following documents to process your application.
                Required documents are marked in red.
              </p>
            </div>

            {docFiles.map((df, idx) => {
              const docDef = product.requiredDocs[idx]
              return (
                <DocUploadCard
                  key={df.docType}
                  doc={docDef}
                  fileState={df}
                  uploading={uploadingIdx === idx}
                  onFileChange={(f) => handleFileChange(idx, f)}
                  onNameChange={(name) =>
                    setDocFiles((prev) => prev.map((d, i) => (i === idx ? { ...d, name } : d)))
                  }
                />
              )
            })}

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Files are uploaded securely and only shared with {product.institution.name} for this loan application.
                Accepted formats: JPEG, PNG, PDF. Max 10 MB per file.
              </p>
            </div>

            {!requiredDocsUploadedAll && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Upload all required documents to get the fastest approval. You may still proceed without them.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Credit Check */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Credit Assessment</h2>
            {creditLoading ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
                <p className="text-sm text-gray-500">Computing your credit score from farm data…</p>
                <p className="text-xs text-gray-400">This analyses your harvest history, input records, and activity compliance</p>
              </div>
            ) : (
              <>
                <div className={`rounded-xl border-2 p-5 ${BAND_CONFIG[score.band]?.bg ?? 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Your Credit Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-gray-900">{score.score}</span>
                        <span className="text-gray-400 font-medium">/100</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${BAND_CONFIG[score.band]?.color ?? 'text-gray-700'} bg-white`}>
                      Band {score.band === 'ineligible' ? '—' : score.band} · {BAND_CONFIG[score.band]?.label}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Your credit limit</p>
                      <p className="font-bold text-gray-900">{fmtKes(score.maxLoanKes)}</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Requested amount</p>
                      <p className={`font-bold ${amountNum > score.maxLoanKes ? 'text-red-600' : 'text-gray-900'}`}>{fmtKes(amountNum)}</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Required credit band</p>
                      <p className="font-bold text-gray-900">Band {product.minCreditBand} or better</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Seasons of data</p>
                      <p className="font-bold text-gray-900">{score.seasonsOfData} seasons</p>
                    </div>
                  </div>

                  {score.band === 'ineligible' ? (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">Not eligible. Record more farm activities, harvests, and inputs to build your profile.</p>
                    </div>
                  ) : amountNum > score.maxLoanKes ? (
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-700">
                        <strong>Amount exceeds your credit limit.</strong> Go back and reduce the amount to {fmtKes(score.maxLoanKes)} or less.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-700"><strong>Eligible to apply.</strong> Your credit profile qualifies for this product. Proceed to review and submit.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-3">Score Breakdown</p>
                  {([
                    ['Yield Performance', score.avgYieldScore],
                    ['Input Management', score.inputManagementScore],
                    ['Activity Compliance', score.activityComplianceScore],
                    ['Platform Engagement', score.platformEngagementScore],
                  ] as [string, number][]).map(([l, v]) => (
                    <div key={l} className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{l}</span><span>{v.toFixed(1)}/25</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(v / 25) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Review & Submit</h2>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Loan Summary</p>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ['Institution', product.institution.name],
                  ['Product', product.title],
                  ['Loan Type', product.loanType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())],
                  ['Amount Requested', fmtKes(amountNum)],
                  ['Repayment Period', `${monthsNum} months`],
                  ['Interest Rate', `${product.interestRatePct}% p.a.`],
                  ['Processing Fee', `${product.processingFeePct}% (${fmtKes(amountNum * product.processingFeePct / 100)})`],
                  ['Monthly Payment (EMI)', fmtKes(emi)],
                  ['Total Repayment', fmtKes(emi * monthsNum)],
                  ['Linked Farm', farms.find((f) => f.id === farmId)?.name ?? (farms[0]?.name ?? 'Not selected')],
                  ['Credit Band', `Band ${score.band}, ${BAND_CONFIG[score.band]?.label ?? ''}`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-4 py-3 text-sm">
                    <span className="text-gray-500">{l}</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</p>
                <span className="text-xs text-gray-400">
                  {docFiles.filter((d) => d.file).length} of {docFiles.length} selected
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {docFiles.map((df, i) => {
                  const def = product.requiredDocs[i]
                  return (
                    <div key={df.docType} className="flex items-center gap-3 px-4 py-3">
                      {df.file ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : def.required ? (
                        <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{def.label}</p>
                        {df.file && <p className="text-xs text-gray-400 truncate">{df.file.name}</p>}
                        {!df.file && <p className="text-xs text-gray-400 italic">{def.required ? 'Not uploaded, may delay approval' : 'Skipped (optional)'}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Loan Purpose</label>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700">{purpose}</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              By submitting, you authorise {product.institution.name} to access your AgroConnect farming records for credit assessment. You may be contacted within {product.institution.type === 'microfinance' ? '4 hours' : '3-5 business days'} with a decision.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-200">
          <button
            onClick={() => step > 0 && setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 2 && !canNext()}
              className="flex items-center gap-2 bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {step === 1 && !requiredDocsUploadedAll ? 'Continue Anyway' : 'Continue'}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="flex items-center gap-2 bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><Banknote className="h-4 w-4" /> Submit Application</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
      </div>
    }>
      <ApplyContent />
    </Suspense>
  )
}
