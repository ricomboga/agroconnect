import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ArrowLeft, FileText, User, Sprout, BarChart2, Download, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoanActions } from './LoanActions'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

interface CreditScore {
  id: string
  avgYieldScore: number
  inputManagementScore: number
  activityComplianceScore: number
  platformEngagementScore: number
  seasonsOfData: number
  averageYieldKg: number | null
  inputCompliancePct: number | null
  createdAt: string
}

interface FarmerInfo {
  id: string
  fullName: string
  phone: string
  county: string
  kycVerified: boolean
  memberSince: string
}

interface LoanDocument {
  id: string
  type: 'national_id' | 'farm_ownership' | 'other'
  name: string
  downloadUrl: string
  uploadedAt: string
}

interface LoanDetail {
  id: string
  farmerId: string
  type: string
  amountRequestedKes: string
  creditScore: string | null
  creditBand: string | null
  status: string
  submittedAt: string | null
  approvedAmountKes: string | null
  interestRatePct: string | null
  rejectionReason: string | null
  createdAt: string
}

interface DetailData {
  loan: LoanDetail
  creditScore: CreditScore | null
  farmer: FarmerInfo | null
  documents: LoanDocument[]
}

const DOC_TYPE_LABELS: Record<LoanDocument['type'], string> = {
  national_id: 'National ID',
  farm_ownership: 'Farm Ownership',
  other: 'Document',
}

async function fetchLoanDetail(loanId: string, token: string): Promise<DetailData | null> {
  try {
    const res = await fetch(`${FINANCE_URL}/api/v1/finance/lender/loans/${loanId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.status === 404 || res.status === 403) return null
    if (!res.ok) return null
    const body = (await res.json()) as { data: DetailData }
    return body.data
  } catch {
    return null
  }
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  agricultural_working_capital: 'Working Capital',
  back_to_school: 'Back to School',
  asset_finance: 'Asset Finance',
  emergency: 'Emergency',
}

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'warning',
  under_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  disbursed: 'success',
  repaid: 'secondary',
  defaulted: 'destructive',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 25) * 100
  const color =
    pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : pct >= 25 ? 'bg-orange-400' : 'bg-red-400'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {score}
          <span className="text-gray-400"> / 25</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatKes(amount: string | null): string {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  const token = cookies().get('__ac')?.value ?? ''
  const data = await fetchLoanDetail(params.id, token)

  if (!data) notFound()

  const { loan, creditScore, farmer, documents } = data
  const totalScore = creditScore
    ? creditScore.avgYieldScore +
      creditScore.inputManagementScore +
      creditScore.activityComplianceScore +
      creditScore.platformEngagementScore
    : null

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/lender"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Pipeline
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loan Application</h1>
            <p className="mt-1 font-mono text-xs text-gray-400">{loan.id}</p>
          </div>
          <Badge variant={STATUS_VARIANTS[loan.status] ?? 'secondary'} className="text-sm px-3 py-1">
            {loan.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Farmer profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-gray-500" />
                Farmer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {farmer ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                    <p className="font-medium text-gray-900 mt-0.5">{farmer.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                    <p className="font-mono text-gray-900 mt-0.5">{farmer.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">County</p>
                    <p className="text-gray-900 mt-0.5">{farmer.county}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">KYC</p>
                    <p className="mt-0.5 flex items-center gap-1">
                      {farmer.kycVerified ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-green-700">Verified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-red-700">Unverified</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Member Since</p>
                    <p className="text-gray-900 mt-0.5">{formatDate(farmer.memberSince)}</p>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Farmer ID</p>
                  <p className="font-mono text-gray-900 mt-0.5">{loan.farmerId}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Loan Type</p>
                <p className="text-gray-900 mt-0.5">{LOAN_TYPE_LABELS[loan.type] ?? loan.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Amount Requested</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatKes(loan.amountRequestedKes)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p>
                <p className="text-gray-900 mt-0.5">{formatDate(loan.submittedAt)}</p>
              </div>
              {loan.approvedAmountKes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Approved Amount</p>
                  <p className="font-semibold text-green-700 mt-0.5">{formatKes(loan.approvedAmountKes)}</p>
                </div>
              )}
              {loan.interestRatePct && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Interest Rate</p>
                  <p className="text-gray-900 mt-0.5">{Number(loan.interestRatePct).toFixed(2)}%</p>
                </div>
              )}
              {loan.rejectionReason && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Rejection Reason</p>
                  <p className="text-red-700 mt-0.5">{loan.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credit score breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4 text-gray-500" />
                Credit Score Breakdown
                {totalScore !== null && (
                  <span className="ml-auto text-lg font-bold text-gray-900">
                    {totalScore}
                    <span className="text-sm font-normal text-gray-400"> / 100</span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creditScore ? (
                <div className="space-y-4">
                  <ScoreBar label="Average Yield" score={creditScore.avgYieldScore} />
                  <ScoreBar label="Input Management" score={creditScore.inputManagementScore} />
                  <ScoreBar label="Activity Compliance" score={creditScore.activityComplianceScore} />
                  <ScoreBar label="Platform Engagement" score={creditScore.platformEngagementScore} />
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4 text-center">No credit score data available</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {['submitted', 'under_review'].includes(loan.status) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <LoanActions loanId={loan.id} currentStatus={loan.status} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Farm records summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sprout className="h-4 w-4 text-gray-500" />
                Farm Records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {creditScore ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Seasons of data</span>
                    <span className="font-medium text-gray-900">{creditScore.seasonsOfData}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg. yield</span>
                    <span className="font-medium text-gray-900">
                      {creditScore.averageYieldKg != null
                        ? `${creditScore.averageYieldKg.toLocaleString()} kg`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Input compliance</span>
                    <span className="font-medium text-gray-900">
                      {creditScore.inputCompliancePct != null
                        ? `${creditScore.inputCompliancePct}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Credit band</span>
                    <span className="font-bold text-gray-900">{loan.creditBand ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Composite score</span>
                    <span className="font-medium text-gray-900">
                      {loan.creditScore ? Number(loan.creditScore).toFixed(1) : '—'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-center py-2">No farm records linked</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-gray-500" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {DOC_TYPE_LABELS[doc.type]} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No documents uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
