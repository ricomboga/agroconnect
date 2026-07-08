'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Search,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Star,
  Building2,
  Banknote,
  CalendarDays,
  ShieldCheck,
  FileText,
  Percent,
  Plus,
  AlertTriangle,
  Wallet,
  History,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  LOAN_PRODUCTS,
  LOAN_TYPE_META,
  DUMMY_CREDIT_SCORE,
  DUMMY_LOANS,
  calcEMI,
  fmtKes,
  type LoanProduct,
  type DummyLoan,
  type PaymentRecord,
} from './_data/loanProducts'

// ─── types ───────────────────────────────────────────────────────────────────

type CreditScoreShape = {
  score: number
  band: 'A' | 'B' | 'C' | 'D' | 'ineligible'
  maxLoanKes: number
  seasonsOfData: number
  avgYieldScore: number
  inputManagementScore: number
  activityComplianceScore: number
  platformEngagementScore: number
  computedAt: string
}

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; Icon: React.ComponentType<{ className?: string }> }> = {
  draft:        { label: 'Draft',        color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400',    Icon: AlertCircle },
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',    Icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-500',  Icon: Clock },
  approved:     { label: 'Approved',     color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', Icon: CheckCircle2 },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     Icon: XCircle },
  disbursed:    { label: 'Disbursed',    color: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-500',  Icon: CheckCircle2 },
  repaid:       { label: 'Fully Repaid', color: 'bg-green-100 text-green-700',     dot: 'bg-green-500',   Icon: CheckCircle2 },
  defaulted:    { label: 'Defaulted',    color: 'bg-red-100 text-red-700',         dot: 'bg-red-600',     Icon: XCircle },
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  agricultural_working_capital: 'Agricultural Working Capital',
  back_to_school: 'Back to School',
  asset_finance: 'Asset Finance',
  emergency: 'Emergency Loan',
}

const FILTER_TYPES = [
  { id: '', label: 'All Loans' },
  { id: 'agricultural_working_capital', label: 'Agricultural' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'asset_finance', label: 'Asset Finance' },
  { id: 'back_to_school', label: 'Back to School' },
]

const BAND_COLORS: Record<string, string> = {
  A: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200',
  B: 'text-blue-700 bg-blue-50 ring-1 ring-blue-200',
  C: 'text-yellow-700 bg-yellow-50 ring-1 ring-yellow-200',
  D: 'text-orange-700 bg-orange-50 ring-1 ring-orange-200',
  ineligible: 'text-red-700 bg-red-50 ring-1 ring-red-200',
}

const RING_COLOR: Record<string, string> = {
  A: '#059669', B: '#2563eb', C: '#d97706', D: '#ea580c', ineligible: '#ef4444',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── WelcomeBanner ────────────────────────────────────────────────────────────

function WelcomeBanner({ score, loans }: { score: CreditScoreShape; loans: DummyLoan[] }) {
  const user = useAuthStore((s) => s.user)
  const firstName = (user?.fullName ?? user?.phone ?? 'Farmer').split(' ')[0]
  const bandColor = BAND_COLORS[score.band] ?? BAND_COLORS.ineligible
  const ringColor = RING_COLOR[score.band] ?? RING_COLOR.ineligible
  const pct = score.score / 100
  const disbursed = loans.filter((l) => l.status === 'disbursed')
  const pending = loans.filter((l) => ['submitted', 'under_review'].includes(l.status))

  return (
    <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-950 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Greeting */}
        <div className="flex-1 min-w-0">
          <p className="text-green-300 text-sm font-medium">{getGreeting()}</p>
          <h1 className="text-2xl font-bold mt-0.5">{firstName}!</h1>
          <p className="text-green-300 text-sm mt-1">Here is your loan portfolio overview</p>

          {/* Quick stats row */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2.5 min-w-[110px]">
              <p className="text-[11px] text-green-300 font-medium uppercase tracking-wide">Active Loans</p>
              <p className="text-xl font-bold text-white mt-0.5">{disbursed.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2.5 min-w-[110px]">
              <p className="text-[11px] text-green-300 font-medium uppercase tracking-wide">Under Review</p>
              <p className="text-xl font-bold text-white mt-0.5">{pending.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2.5 min-w-[130px]">
              <p className="text-[11px] text-green-300 font-medium uppercase tracking-wide">Max Eligible</p>
              <p className="text-lg font-bold text-white mt-0.5">{fmtKes(score.maxLoanKes)}</p>
            </div>
          </div>
        </div>

        {/* Credit score ring */}
        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-center">
            <div className="relative h-20 w-20">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke={ringColor}
                  strokeWidth="3.5"
                  strokeDasharray={`${pct * 87.96} 87.96`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">
                {score.score}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bandColor}`}>Band {score.band}</span>
            </div>
            <p className="text-[10px] text-green-400 mt-1">Credit Score</p>
          </div>

          {/* Sub-scores */}
          <div className="hidden md:block space-y-2 w-36">
            {([
              ['Yield', score.avgYieldScore],
              ['Inputs', score.inputManagementScore],
              ['Activity', score.activityComplianceScore],
              ['Engagement', score.platformEngagementScore],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label}>
                <div className="flex justify-between text-[10px] text-green-300 mb-0.5">
                  <span>{label}</span>
                  <span>{val.toFixed(1)}/25</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(val / 25) * 100}%`, background: ringColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AlertPanel ───────────────────────────────────────────────────────────────

function AlertPanel({ loans }: { loans: DummyLoan[] }) {
  const overdueLoans = loans.filter((l) =>
    l.status === 'disbursed' && l.paymentSchedule.some((p) => p.status === 'overdue'),
  )
  if (overdueLoans.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 flex-shrink-0">
          <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Payment Action Required
          </h3>
          <p className="text-xs text-red-600 mt-0.5 mb-3">
            {overdueLoans.length === 1
              ? 'You have 1 loan with an overdue payment. Prioritise this to avoid penalties and protect your credit score.'
              : `You have ${overdueLoans.length} loans with overdue payments. Address these immediately to protect your credit rating.`}
          </p>
          <div className="space-y-2">
            {overdueLoans.map((loan) => {
              const overduePmts = loan.paymentSchedule.filter((p) => p.status === 'overdue')
              const oldest = overduePmts[0]
              const daysLate = oldest ? daysBetween(oldest.dueDate, new Date().toISOString().slice(0, 10)) : 0
              const emi = loan.approvedAmountKes && loan.interestRatePct
                ? calcEMI(loan.approvedAmountKes, loan.interestRatePct, loan.repaymentMonths)
                : 0
              return (
                <div key={loan.id} className="flex items-center justify-between bg-white border border-red-200 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-7 w-7 rounded-md ${loan.institution.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                      {loan.institution.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-red-900 truncate">{loan.institution.shortName}, {loan.productTitle}</p>
                      <p className="text-[10px] text-red-500">
                        {overduePmts.length} payment{overduePmts.length > 1 ? 's' : ''} overdue · {daysLate} day{daysLate !== 1 ? 's' : ''} late
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-red-500">Outstanding</p>
                      <p className="text-sm font-bold text-red-700">{fmtKes(emi * overduePmts.length)}</p>
                    </div>
                    <Link
                      href={`/farmer/loans/${loan.id}`}
                      className="text-[10px] font-semibold bg-red-600 text-white px-2.5 py-1 rounded-md hover:bg-red-700 transition-colors whitespace-nowrap"
                    >
                      Pay Now
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LoanPaymentCard ──────────────────────────────────────────────────────────

function PaymentHistoryTable({ schedule, emi }: { schedule: PaymentRecord[]; emi: number }) {
  const statusStyle: Record<PaymentRecord['status'], string> = {
    paid:     'bg-emerald-100 text-emerald-700',
    overdue:  'bg-red-100 text-red-700',
    upcoming: 'bg-gray-100 text-gray-500',
    due_today:'bg-yellow-100 text-yellow-700',
  }
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mt-3">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-3 py-2 text-gray-500 font-semibold">Month</th>
            <th className="text-left px-3 py-2 text-gray-500 font-semibold">Due Date</th>
            <th className="text-left px-3 py-2 text-gray-500 font-semibold">Amount</th>
            <th className="text-left px-3 py-2 text-gray-500 font-semibold">Paid On</th>
            <th className="text-left px-3 py-2 text-gray-500 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {schedule.map((p) => (
            <tr key={p.month} className={p.status === 'overdue' ? 'bg-red-50' : 'bg-white'}>
              <td className="px-3 py-2 font-medium text-gray-700">#{p.month}</td>
              <td className="px-3 py-2 text-gray-600">{fmtDate(p.dueDate)}</td>
              <td className="px-3 py-2 font-semibold text-gray-800">{fmtKes(emi)}</td>
              <td className="px-3 py-2 text-gray-500">
                {p.paidDate ? fmtDate(p.paidDate) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-3 py-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusStyle[p.status]}`}>
                  {p.status === 'due_today' ? 'Due Today' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LoanPaymentCard({ loan }: { loan: DummyLoan }) {
  const [showHistory, setShowHistory] = useState(false)
  const emi = loan.approvedAmountKes && loan.interestRatePct
    ? calcEMI(loan.approvedAmountKes, loan.interestRatePct, loan.repaymentMonths)
    : 0
  const totalRepay = emi * loan.repaymentMonths
  const paidMonths = loan.paymentSchedule.filter((p) => p.status === 'paid').length
  const overdueMonths = loan.paymentSchedule.filter((p) => p.status === 'overdue').length
  const amountPaid = emi * paidMonths
  const amountRemaining = totalRepay - amountPaid
  const progressPct = loan.repaymentMonths > 0 ? (paidMonths / loan.repaymentMonths) * 100 : 0
  const nextDue = loan.paymentSchedule.find((p) => p.status === 'upcoming' || p.status === 'due_today' || p.status === 'overdue')
  const isOverdue = overdueMonths > 0

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-5 py-3.5 ${isOverdue ? 'bg-red-50 border-b border-red-100' : 'bg-gray-50 border-b border-gray-100'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-9 w-9 rounded-lg ${loan.institution.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {loan.institution.initials}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 font-medium">{loan.institution.name}</p>
            <p className="text-sm font-bold text-gray-900 truncate">{loan.productTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {isOverdue && (
            <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> {overdueMonths} Overdue
            </span>
          )}
          <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">Active</span>
          <Link href={`/farmer/loans/${loan.id}`} className="text-gray-400 hover:text-green-600 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Approved</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{fmtKes(loan.approvedAmountKes ?? 0)}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Paid So Far</p>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">{fmtKes(amountPaid)}</p>
          </div>
          <div className={`rounded-lg p-2.5 text-center ${isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
            <p className={`text-[10px] font-medium uppercase tracking-wide ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>Remaining</p>
            <p className={`text-sm font-bold mt-0.5 ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>{fmtKes(amountRemaining)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Monthly EMI</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{fmtKes(emi)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 font-medium">{paidMonths} of {loan.repaymentMonths} months paid</span>
            <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-green-700'}`}>
              {progressPct.toFixed(0)}% complete
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-400' : 'bg-green-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {overdueMonths > 0 && (
            <div className="mt-1" style={{ marginLeft: `${progressPct}%` }}>
              <div className="h-2.5 rounded-full bg-red-500 opacity-50" style={{ width: `${(overdueMonths / loan.repaymentMonths) * 100}%` }} />
            </div>
          )}
        </div>

        {/* Next payment */}
        {nextDue && (
          <div className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 ${isOverdue && nextDue.status === 'overdue' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-100'}`}>
            <div className="flex items-center gap-2">
              <CalendarDays className={`h-4 w-4 ${isOverdue && nextDue.status === 'overdue' ? 'text-red-500' : 'text-green-600'}`} />
              <div>
                <p className={`text-[10px] font-medium ${isOverdue && nextDue.status === 'overdue' ? 'text-red-500' : 'text-green-600'}`}>
                  {nextDue.status === 'overdue' ? `Overdue since ${fmtDate(nextDue.dueDate)}` : `Next payment due ${fmtDate(nextDue.dueDate)}`}
                </p>
                {nextDue.status !== 'overdue' && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    in {daysBetween(new Date().toISOString().slice(0, 10), nextDue.dueDate)} days
                  </p>
                )}
              </div>
            </div>
            <p className={`text-sm font-bold ${isOverdue && nextDue.status === 'overdue' ? 'text-red-700' : 'text-green-800'}`}>
              {fmtKes(emi)}
            </p>
          </div>
        )}

        {/* Payment history toggle */}
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 px-1 py-0.5 transition-colors group"
        >
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
            Payment History
          </span>
          {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showHistory && (
          <PaymentHistoryTable schedule={loan.paymentSchedule} emi={emi} />
        )}

        {/* M-Pesa ref */}
        {loan.mpesaDisbursementRef && (
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-50">
            <span>Disbursed via M-Pesa</span>
            <span className="font-mono font-semibold text-gray-600">{loan.mpesaDisbursementRef}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LoanStatusCard (pending / review / rejected) ────────────────────────────

function LoanStatusCard({ loan }: { loan: DummyLoan }) {
  const s = STATUS_CONFIG[loan.status] ?? STATUS_CONFIG['draft']
  const { Icon } = s
  const daysAgo = daysBetween(loan.submittedAt.slice(0, 10), new Date().toISOString().slice(0, 10))

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex items-center gap-4 px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all group">
      <div className={`h-10 w-10 rounded-lg ${loan.institution.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {loan.institution.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{loan.institution.name}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{loan.productTitle}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-gray-500">{fmtKes(loan.amountRequestedKes)}</span>
          <span className="text-[10px] text-gray-400">·</span>
          <span className="text-xs text-gray-500">Applied {daysAgo}d ago</span>
          {loan.status === 'under_review' && (
            <>
              <span className="text-[10px] text-gray-400">·</span>
              <span className="text-xs text-yellow-600 font-medium">Est. 2–5 business days</span>
            </>
          )}
        </div>
        {loan.rejectionReason && (
          <p className="text-[11px] text-red-500 mt-1 italic">{loan.rejectionReason}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
          <Icon className="h-3 w-3" /> {s.label}
        </span>
        <Link href={`/farmer/loans/${loan.id}`} className="text-gray-300 group-hover:text-green-600 transition-colors">
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

function ProductCard({ product, creditBand }: { product: LoanProduct; creditBand: string }) {
  const [expanded, setExpanded] = useState(false)
  const meta = LOAN_TYPE_META[product.loanType]
  const sampleAmount = Math.min(50_000, product.maxAmountKes)
  const sampleTerm = Math.min(12, product.maxTermMonths)
  const emi = calcEMI(sampleAmount, product.interestRatePct, sampleTerm)
  const totalRepay = emi * sampleTerm
  const totalInterest = totalRepay - sampleAmount
  const processingFee = sampleAmount * (product.processingFeePct / 100)
  const bandOrder = ['A', 'B', 'C', 'D', 'ineligible']
  const eligible = bandOrder.indexOf(creditBand) <= bandOrder.indexOf(product.minCreditBand)

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 ${product.featured ? 'border-green-300 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
      {product.featured && (
        <div className="flex items-center gap-1.5 bg-green-700 text-white text-xs font-semibold px-4 py-1.5 rounded-t-xl">
          <Star className="h-3 w-3 fill-current" /> Featured Loan Product
        </div>
      )}
      <div className="p-5">
        {/* Institution header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${product.institution.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {product.institution.initials}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{product.institution.name}</p>
              <h3 className="text-base font-bold text-gray-900 leading-tight">{product.title}</h3>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            {product.postedDaysAgo <= 3 && (
              <span className="text-[10px] font-bold text-white bg-green-500 px-1.5 py-0.5 rounded-full">NEW</span>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 italic">&ldquo;{product.tagline}&rdquo;</p>

        {/* Key numbers */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Interest</p>
            <p className="text-lg font-bold text-gray-900">{product.interestRatePct}%</p>
            <p className="text-[10px] text-gray-400">per annum</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Amount</p>
            <p className="text-sm font-bold text-gray-900 leading-tight">{fmtKes(product.minAmountKes)}</p>
            <p className="text-[10px] text-gray-400">up to {fmtKes(product.maxAmountKes)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Term</p>
            <p className="text-lg font-bold text-gray-900">{product.maxTermMonths}mo</p>
            <p className="text-[10px] text-gray-400">max repayment</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {product.tags.map((t) => (
            <span key={t} className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t}</span>
          ))}
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {product.processingFeePct}% processing fee
          </span>
        </div>

        {/* EMI sample */}
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-green-600 font-medium">Sample: {fmtKes(sampleAmount)} over {sampleTerm} months</p>
            <p className="text-sm font-bold text-green-800">~{fmtKes(emi)}/month</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-green-600">Total interest</p>
            <p className="text-sm font-semibold text-green-700">{fmtKes(totalInterest)}</p>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-100 pt-4 mb-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-400" /> About this loan
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-gray-400" /> Full cost breakdown, {fmtKes(sampleAmount)} / {sampleTerm}mo
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Monthly Payment (EMI)', fmtKes(emi)],
                  ['Total Repayment', fmtKes(totalRepay)],
                  ['Total Interest', fmtKes(totalInterest)],
                  ['Processing Fee', fmtKes(processingFee)],
                  ['Total Cost of Credit', fmtKes(totalInterest + processingFee)],
                  ['Grace Period', `${product.gracePeriodMonths} month${product.gracePeriodMonths !== 1 ? 's' : ''}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between bg-gray-50 rounded px-2.5 py-1.5">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-400" /> Eligibility requirements
              </p>
              <ul className="space-y-1">
                {product.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  Minimum credit band: <strong className="ml-1">{product.minCreditBand}</strong>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-400" /> Documents required
              </p>
              <div className="space-y-1.5">
                {product.requiredDocs.map((d) => (
                  <div key={d.type} className="flex items-center gap-2 text-xs">
                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${d.required ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={d.required ? 'text-gray-700' : 'text-gray-400'}>{d.label}</span>
                    {!d.required && <span className="text-[10px] text-gray-400 italic">(optional)</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {product.applicantsCount.toLocaleString()} applicants
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {product.postedDaysAgo}d ago
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Less' : 'Details'}
            </button>
            <Link
              href={`/farmer/loans/apply?productId=${product.id}`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${
                eligible
                  ? 'bg-green-700 text-white hover:bg-green-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
              }`}
            >
              Apply Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {!eligible && (
          <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Requires Band {product.minCreditBand} credit. Improve your score by recording more farm activity
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoansPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: creditScore } = useQuery({
    queryKey: ['credit-score'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/finance/credit-score')
        if (!res.ok) return DUMMY_CREDIT_SCORE
        return (await res.json()).data ?? DUMMY_CREDIT_SCORE
      } catch {
        return DUMMY_CREDIT_SCORE
      }
    },
  })

  const { data: myLoans = [] } = useQuery({
    queryKey: ['my-loans'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/finance/loans')
        if (!res.ok) return DUMMY_LOANS
        return (await res.json()).data ?? DUMMY_LOANS
      } catch {
        return DUMMY_LOANS
      }
    },
  })

  const score = (creditScore ?? DUMMY_CREDIT_SCORE) as CreditScoreShape
  const loans = myLoans as DummyLoan[]

  const disbursedLoans = loans.filter((l) => l.status === 'disbursed')
  const pendingLoans = loans.filter((l) => ['draft', 'submitted', 'under_review'].includes(l.status))
  const closedLoans = loans.filter((l) => ['repaid', 'rejected', 'defaulted'].includes(l.status))
  const hasAnyLoans = loans.length > 0

  const institutions = [...new Map(LOAN_PRODUCTS.map((p) => [p.institution.id, p.institution])).values()]

  const filtered = LOAN_PRODUCTS.filter((p) => {
    if (typeFilter && p.loanType !== typeFilter) return false
    if (institutionFilter && p.institution.id !== institutionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.institution.name.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const featuredProducts = filtered.filter((p) => p.featured)
  const regularProducts = filtered.filter((p) => !p.featured)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Loans</h1>
            <p className="text-sm text-gray-400 mt-0.5">Your loan portfolio & available products</p>
          </div>
          <Link
            href="/farmer/loans/apply"
            className="hidden sm:inline-flex items-center gap-2 bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-800 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> New Application
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Welcome + credit score */}
        <WelcomeBanner score={score} loans={loans} />

        {/* Overdue alert */}
        <AlertPanel loans={loans} />

        {/* ── My Loan Applications ── */}
        {hasAnyLoans && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-700" />
                <h2 className="text-base font-bold text-gray-900">My Loan Applications</h2>
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{loans.length}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Active / disbursed loans with payment progress */}
              {disbursedLoans.length > 0 && (
                <div className="space-y-4">
                  {disbursedLoans.length > 0 && pendingLoans.length > 0 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Loans</p>
                  )}
                  {disbursedLoans.map((l) => <LoanPaymentCard key={l.id} loan={l} />)}
                </div>
              )}

              {/* Pending applications */}
              {pendingLoans.length > 0 && (
                <div className="space-y-3">
                  {disbursedLoans.length > 0 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Pending Applications</p>
                  )}
                  {pendingLoans.map((l) => <LoanStatusCard key={l.id} loan={l} />)}
                </div>
              )}

              {/* Closed / repaid / rejected */}
              {closedLoans.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Past Loans</p>
                  {closedLoans.map((l) => <LoanStatusCard key={l.id} loan={l} />)}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Available Loan Products ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-green-700" />
            <h2 className="text-base font-bold text-gray-900">Available Loan Products</h2>
            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {LOAN_PRODUCTS.length} products · {institutions.length} institutions
            </span>
          </div>

          {/* Search + institution */}
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, institution, or tag…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>
            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
            >
              <option value="">All Institutions</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Type chips */}
          <div className="flex gap-2 flex-wrap mb-5">
            {FILTER_TYPES.map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                  typeFilter === f.id
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
              <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No loan products match your filters</p>
              <button
                onClick={() => { setSearch(''); setTypeFilter(''); setInstitutionFilter('') }}
                className="text-sm text-green-700 mt-2 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {featuredProducts.length > 0 && (
                <>
                  <div className="lg:col-span-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" /> Featured Products
                    </p>
                  </div>
                  {featuredProducts.map((p) => <ProductCard key={p.id} product={p} creditBand={score.band} />)}
                </>
              )}
              {regularProducts.length > 0 && (
                <>
                  {featuredProducts.length > 0 && (
                    <div className="lg:col-span-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3 mt-2">
                        <Building2 className="h-3.5 w-3.5" /> More Products
                      </p>
                    </div>
                  )}
                  {regularProducts.map((p) => <ProductCard key={p.id} product={p} creditBand={score.band} />)}
                </>
              )}
            </div>
          )}
        </section>

        {/* Improve score tip (only when no loans yet) */}
        {!hasAnyLoans && (
          <div className="bg-gradient-to-br from-green-800 to-green-950 rounded-xl p-5 text-white">
            <p className="text-sm font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> How to improve your credit score
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-green-200">
              {[
                'Record all farm activities regularly',
                'Log every input purchase and harvest',
                'Maintain accurate acreage data',
                'Complete your farm profiles fully',
              ].map((t) => (
                <li key={t} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
