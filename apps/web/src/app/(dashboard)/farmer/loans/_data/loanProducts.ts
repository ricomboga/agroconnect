export interface RequiredDoc {
  type: 'national_id' | 'land_title' | 'farm_photo' | 'bank_statement' | 'payslip' | 'other'
  label: string
  required: boolean
  hint: string
}

export interface LoanProduct {
  id: string
  institution: {
    id: string
    name: string
    shortName: string
    type: 'bank' | 'microfinance' | 'sacco' | 'mfi'
    initials: string
    color: string
    textColor: string
  }
  title: string
  loanType: 'agricultural_working_capital' | 'back_to_school' | 'asset_finance' | 'emergency'
  tagline: string
  description: string
  interestRatePct: number
  processingFeePct: number
  minAmountKes: number
  maxAmountKes: number
  minTermMonths: number
  maxTermMonths: number
  gracePeriodMonths: number
  minCreditBand: 'A' | 'B' | 'C' | 'D'
  requirements: string[]
  requiredDocs: RequiredDoc[]
  postedDaysAgo: number
  applicantsCount: number
  tags: string[]
  featured: boolean
}

export interface PaymentRecord {
  month: number
  dueDate: string
  paidDate: string | null
  status: 'paid' | 'overdue' | 'upcoming' | 'due_today'
}

export interface DummyLoan {
  id: string
  productId: string
  productTitle: string
  type: string
  institution: { name: string; shortName: string; initials: string; color: string }
  amountRequestedKes: number
  approvedAmountKes: number | null
  interestRatePct: number | null
  repaymentMonths: number
  purpose: string
  partnerBankId: string
  creditScore: number
  creditBand: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'repaid' | 'defaulted'
  disbursedAt: string | null
  mpesaDisbursementRef: string | null
  rejectionReason: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
  documents: Array<{
    id: string
    name: string
    documentType: string
    storageKey: string
    mimeType: string
    sizeBytes: number
    uploadedAt: string
  }>
  paymentSchedule: PaymentRecord[]
}

export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: 'eq-kilimo-faida',
    institution: {
      id: 'partner-eq-001',
      name: 'Equity Bank Kenya',
      shortName: 'Equity Bank',
      type: 'bank',
      initials: 'EB',
      color: 'bg-red-600',
      textColor: 'text-red-700',
    },
    title: 'Kilimo Faida Loan',
    loanType: 'agricultural_working_capital',
    tagline: 'Fast seasonal financing for inputs, seeds & labour',
    description:
      'Kilimo Faida provides smallholder and commercial farmers with flexible working capital to purchase inputs, pay for labour, and manage operational costs across the growing season. Repayment is aligned to your harvest cycle.',
    interestRatePct: 13.0,
    processingFeePct: 1.0,
    minAmountKes: 5_000,
    maxAmountKes: 500_000,
    minTermMonths: 3,
    maxTermMonths: 12,
    gracePeriodMonths: 1,
    minCreditBand: 'B',
    requirements: [
      'Active AgroConnect account with at least one recorded season',
      'At least 0.5 acres of cultivated land',
      'Valid national identification',
    ],
    requiredDocs: [
      { type: 'national_id', label: 'National ID (both sides)', required: true, hint: 'Clear photo or scan of your national identity card, front and back.' },
      { type: 'farm_photo', label: 'Farm Photo', required: true, hint: 'A recent photo showing your farm or crop field.' },
      { type: 'bank_statement', label: 'Bank Statement (3 months)', required: false, hint: 'Optional — helps speed up approval for larger amounts.' },
    ],
    postedDaysAgo: 2,
    applicantsCount: 347,
    tags: ['Seasonal', 'Inputs', 'Quick Approval'],
    featured: true,
  },
  {
    id: 'kcb-kilimo',
    institution: {
      id: 'partner-kcb-002',
      name: 'KCB Bank Kenya',
      shortName: 'KCB Bank',
      type: 'bank',
      initials: 'KC',
      color: 'bg-green-700',
      textColor: 'text-green-700',
    },
    title: 'KCB Kilimo Loan',
    loanType: 'agricultural_working_capital',
    tagline: 'High-limit agriculture finance with competitive rates',
    description:
      'KCB Kilimo is designed for established farmers seeking larger working capital to scale operations. With one of the lowest rates in the market and up to 24-month repayment terms, it suits both seasonal crops and perennial produce.',
    interestRatePct: 12.5,
    processingFeePct: 1.5,
    minAmountKes: 10_000,
    maxAmountKes: 1_000_000,
    minTermMonths: 6,
    maxTermMonths: 24,
    gracePeriodMonths: 2,
    minCreditBand: 'B',
    requirements: [
      'Minimum 2 seasons of farming data on AgroConnect',
      'Bank account with KCB or any bank',
      'At least 1 acre of productive farmland',
    ],
    requiredDocs: [
      { type: 'national_id', label: 'National ID', required: true, hint: 'Valid Kenyan national ID card.' },
      { type: 'land_title', label: 'Land Title or Lease Agreement', required: true, hint: 'Official land ownership document or a signed lease if tenant farming.' },
      { type: 'bank_statement', label: 'Bank Statement (6 months)', required: true, hint: 'Full 6-month statement from any bank account.' },
      { type: 'farm_photo', label: 'Farm Photographs', required: false, hint: 'Optional photos showing your current crops or farm setup.' },
    ],
    postedDaysAgo: 5,
    applicantsCount: 512,
    tags: ['High Limit', 'Competitive Rate', 'Long Term'],
    featured: true,
  },
  {
    id: 'faulu-jaza-mkoba',
    institution: {
      id: 'partner-fa-003',
      name: 'Faulu Kenya MFI',
      shortName: 'Faulu Kenya',
      type: 'microfinance',
      initials: 'FK',
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
    title: 'Jaza Mkoba Emergency',
    loanType: 'emergency',
    tagline: 'Same-day emergency funds — disbursed via M-Pesa',
    description:
      'Jaza Mkoba is a fast-turnaround emergency loan for farmers facing urgent cash needs — crop disease treatment, emergency repairs, or household shocks. Minimal documentation, decision within 4 hours, M-Pesa disbursement.',
    interestRatePct: 18.0,
    processingFeePct: 2.0,
    minAmountKes: 2_000,
    maxAmountKes: 50_000,
    minTermMonths: 1,
    maxTermMonths: 6,
    gracePeriodMonths: 0,
    minCreditBand: 'C',
    requirements: [
      'Active AgroConnect account',
      'Registered M-Pesa number',
    ],
    requiredDocs: [
      { type: 'national_id', label: 'National ID', required: true, hint: 'Any valid government-issued photo ID.' },
    ],
    postedDaysAgo: 1,
    applicantsCount: 891,
    tags: ['Same Day', 'M-Pesa', 'No Land Required'],
    featured: false,
  },
  {
    id: 'kwft-mama-kilimo',
    institution: {
      id: 'partner-kwft-004',
      name: 'Kenya Women MFI',
      shortName: 'KWFT',
      type: 'mfi',
      initials: 'KW',
      color: 'bg-purple-600',
      textColor: 'text-purple-700',
    },
    title: 'Mama Kilimo Loan',
    loanType: 'agricultural_working_capital',
    tagline: 'Women-led farm finance with mentorship support',
    description:
      'Mama Kilimo targets women farmers and women-headed households with affordable seasonal loans backed by group guarantee. Includes free agronomist consultation and market linkage support through the KWFT network.',
    interestRatePct: 20.0,
    processingFeePct: 1.0,
    minAmountKes: 1_000,
    maxAmountKes: 100_000,
    minTermMonths: 3,
    maxTermMonths: 12,
    gracePeriodMonths: 1,
    minCreditBand: 'D',
    requirements: [
      'Female-headed household or woman farmer',
      'Active group or chama membership preferred',
      'AgroConnect account with any farm recorded',
    ],
    requiredDocs: [
      { type: 'national_id', label: 'National ID', required: true, hint: 'Kenyan national ID or passport.' },
      { type: 'farm_photo', label: 'Farm Photo', required: true, hint: 'A photo of your farm or garden.' },
      { type: 'other', label: 'Group/Chama Membership Card', required: false, hint: 'Optional — speeds up approval if you are in a registered group.' },
    ],
    postedDaysAgo: 7,
    applicantsCount: 203,
    tags: ['Women', 'Group Guarantee', 'Mentorship'],
    featured: false,
  },
  {
    id: 'coop-shamba-asset',
    institution: {
      id: 'partner-coop-005',
      name: 'Co-operative Bank',
      shortName: 'Co-op Bank',
      type: 'bank',
      initials: 'CB',
      color: 'bg-blue-700',
      textColor: 'text-blue-700',
    },
    title: 'Co-op Shamba Asset Finance',
    loanType: 'asset_finance',
    tagline: 'Finance tractors, irrigation & machinery up to KES 2M',
    description:
      'Co-op Shamba Asset Finance covers the purchase of productive agricultural assets including tractors, irrigation systems, greenhouses, and processing equipment. Security can be the asset being financed.',
    interestRatePct: 14.0,
    processingFeePct: 2.0,
    minAmountKes: 50_000,
    maxAmountKes: 2_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    gracePeriodMonths: 3,
    minCreditBand: 'A',
    requirements: [
      'Minimum 3 seasons of farming data',
      'Proof of land ownership or long-term lease',
      'Asset proforma invoice from registered dealer',
    ],
    requiredDocs: [
      { type: 'national_id', label: 'National ID', required: true, hint: 'Valid national identity document.' },
      { type: 'land_title', label: 'Land Title Deed', required: true, hint: 'Original or certified copy of land title.' },
      { type: 'bank_statement', label: 'Bank Statement (12 months)', required: true, hint: '12-month statement showing farm income flows.' },
      { type: 'other', label: 'Asset Proforma Invoice', required: true, hint: 'Quotation or proforma invoice for the equipment you intend to purchase.' },
      { type: 'farm_photo', label: 'Current Farm Photos', required: false, hint: 'Photos of your existing farm setup.' },
    ],
    postedDaysAgo: 14,
    applicantsCount: 89,
    tags: ['Equipment', 'Long Term', 'High Limit'],
    featured: false,
  },
  {
    id: 'equity-shule',
    institution: {
      id: 'partner-eq-001',
      name: 'Equity Bank Kenya',
      shortName: 'Equity Bank',
      type: 'bank',
      initials: 'EB',
      color: 'bg-red-600',
      textColor: 'text-red-700',
    },
    title: 'Equity Shule Loan',
    loanType: 'back_to_school',
    tagline: 'Pay school fees now, repay after harvest',
    description:
      'Equity Shule helps farmer families meet school fees obligations without liquidating crops or assets at low prices. Funds are disbursed directly to the school or to the farmer\'s account, with repayment scheduled after peak harvest season.',
    interestRatePct: 13.0,
    processingFeePct: 0.5,
    minAmountKes: 3_000,
    maxAmountKes: 150_000,
    minTermMonths: 3,
    maxTermMonths: 9,
    gracePeriodMonths: 0,
    minCreditBand: 'C',
    requirements: [
      'Active AgroConnect account',
      'School fee invoice or admission letter',
    ],
    requiredDocs: [
      { type: 'national_id', label: 'National ID', required: true, hint: 'Your national identity card.' },
      { type: 'other', label: 'School Fee Invoice', required: true, hint: 'Current term fee invoice from the school.' },
      { type: 'payslip', label: 'Payslip or Income Proof', required: false, hint: 'Optional — any evidence of regular income.' },
    ],
    postedDaysAgo: 3,
    applicantsCount: 456,
    tags: ['School Fees', 'Harvest Repayment', 'Low Fee'],
    featured: false,
  },
]

export const LOAN_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  agricultural_working_capital: { label: 'Agricultural', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  back_to_school: { label: 'Back to School', color: 'text-blue-700', bg: 'bg-blue-100' },
  asset_finance: { label: 'Asset Finance', color: 'text-orange-700', bg: 'bg-orange-100' },
  emergency: { label: 'Emergency', color: 'text-red-700', bg: 'bg-red-100' },
}

export const DUMMY_CREDIT_SCORE = {
  score: 72,
  band: 'B' as const,
  maxLoanKes: 350_000,
  seasonsOfData: 3,
  avgYieldScore: 18.5,
  inputManagementScore: 17.0,
  activityComplianceScore: 19.2,
  platformEngagementScore: 17.3,
  computedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
}

export const DUMMY_LOANS: DummyLoan[] = [
  {
    id: 'loan-001-dummy',
    productId: 'eq-kilimo-faida',
    productTitle: 'Kilimo Faida Loan',
    type: 'agricultural_working_capital',
    institution: { name: 'Equity Bank Kenya', shortName: 'Equity Bank', initials: 'EB', color: 'bg-red-600' },
    amountRequestedKes: 80_000,
    approvedAmountKes: null,
    interestRatePct: null,
    repaymentMonths: 6,
    purpose: 'Purchase of certified maize seeds and DAP fertiliser for the main season',
    partnerBankId: 'partner-eq-001',
    creditScore: 72,
    creditBand: 'B',
    status: 'under_review',
    disbursedAt: null,
    mpesaDisbursementRef: null,
    rejectionReason: null,
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    documents: [
      {
        id: 'doc-001',
        name: 'National ID Front',
        documentType: 'national_id',
        storageKey: 'dev-uploads/national_id_front.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 245_000,
        uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'doc-002',
        name: 'Farm Photo - Maize Field',
        documentType: 'farm_photo',
        storageKey: 'dev-uploads/farm_maize.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1_200_000,
        uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    paymentSchedule: [],
  },
  {
    id: 'loan-002-dummy',
    productId: 'equity-shule',
    productTitle: 'Equity Shule Loan',
    type: 'back_to_school',
    institution: { name: 'Equity Bank Kenya', shortName: 'Equity Bank', initials: 'EB', color: 'bg-red-600' },
    amountRequestedKes: 25_000,
    approvedAmountKes: 25_000,
    interestRatePct: 13.0,
    repaymentMonths: 4,
    purpose: 'Secondary school fees for Form 3 daughter',
    partnerBankId: 'partner-eq-001',
    creditScore: 68,
    creditBand: 'B',
    status: 'disbursed',
    disbursedAt: '2026-04-02T09:00:00.000Z',
    mpesaDisbursementRef: 'QJK7TY89BN',
    rejectionReason: null,
    submittedAt: '2026-03-30T10:15:00.000Z',
    createdAt: '2026-03-30T10:15:00.000Z',
    updatedAt: '2026-04-02T09:00:00.000Z',
    documents: [],
    paymentSchedule: [
      { month: 1, dueDate: '2026-05-02', paidDate: '2026-04-30', status: 'paid' },
      { month: 2, dueDate: '2026-06-02', paidDate: '2026-05-31', status: 'paid' },
      { month: 3, dueDate: '2026-07-02', paidDate: null, status: 'upcoming' },
      { month: 4, dueDate: '2026-08-02', paidDate: null, status: 'upcoming' },
    ],
  },
  {
    id: 'loan-003-dummy',
    productId: 'faulu-jaza-mkoba',
    productTitle: 'Jaza Mkoba Emergency',
    type: 'emergency',
    institution: { name: 'Faulu Kenya MFI', shortName: 'Faulu Kenya', initials: 'FK', color: 'bg-orange-500' },
    amountRequestedKes: 15_000,
    approvedAmountKes: 15_000,
    interestRatePct: 18.0,
    repaymentMonths: 6,
    purpose: 'Emergency treatment for coffee leaf rust affecting 2 acres — fungicide and labour costs',
    partnerBankId: 'partner-fa-003',
    creditScore: 68,
    creditBand: 'C',
    status: 'disbursed',
    disbursedAt: '2026-04-15T11:30:00.000Z',
    mpesaDisbursementRef: 'MYK3PL92QW',
    rejectionReason: null,
    submittedAt: '2026-04-15T08:00:00.000Z',
    createdAt: '2026-04-15T08:00:00.000Z',
    updatedAt: '2026-04-15T11:30:00.000Z',
    documents: [
      {
        id: 'doc-003',
        name: 'National ID',
        documentType: 'national_id',
        storageKey: 'dev-uploads/national_id_faulu.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 210_000,
        uploadedAt: '2026-04-15T08:10:00.000Z',
      },
    ],
    paymentSchedule: [
      { month: 1, dueDate: '2026-05-15', paidDate: '2026-05-13', status: 'paid' },
      { month: 2, dueDate: '2026-06-15', paidDate: null, status: 'overdue' },
      { month: 3, dueDate: '2026-07-15', paidDate: null, status: 'upcoming' },
      { month: 4, dueDate: '2026-08-15', paidDate: null, status: 'upcoming' },
      { month: 5, dueDate: '2026-09-15', paidDate: null, status: 'upcoming' },
      { month: 6, dueDate: '2026-10-15', paidDate: null, status: 'upcoming' },
    ],
  },
]

export function calcEMI(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / months
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

export function fmtKes(n: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n)
}
