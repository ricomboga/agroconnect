import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'

const AUTH = process.env.AUTH_SERVICE_URL ?? ''
const FARM_SERVICE = process.env.FARM_SERVICE_URL ?? ''
const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_SECRET ?? ''

interface FarmerIdentity {
  fullName: string
  phone: string
  county: string | null
  subCounty: string | null
  kycStatus: string
  memberSince: string
}

interface FarmReport {
  farm: {
    name: string
    areaAcres: number
    county: string
    subCounty: string | null
    soilType: string | null
    waterSource: string | null
    farmType: string
    locationLat: number
    locationLng: number
    plots: { name: string; areaAcres: number; currentCrop: string | null; plantedAt: string | null }[]
  } | null
  activitySummary: {
    totalActivitiesLast90Days: number
    completedOnTime: number
    overdueAtQuery: number
    completionRatePct: number
    streakDays: number
    recentCompleted: { date: string; title: string; costKes: number }[]
  }
  overdueActivities: string[]
  harvestHistory: { crop: string; quantityKg: number; harvestDate: string; revenueKes: number | null }[]
  inventory: { name: string; category: string; unit: string; purchasedQty: number; remainingQty: number; purchasedAt: string }[]
  machinery: { name: string; type: string; condition: string; acquiredAt: string; disposedAt: string | null }[]
}

interface CreditReport {
  creditScore: {
    score: number
    band: string
    maxLoanKes: number
    seasonsOfData: number
    breakdown: {
      harvestYieldScore: number
      inputManagementScore: number
      activityComplianceScore: number
      platformEngagementScore: number
    }
  } | null
  loans: { lender: string; amountKes: number; status: string; disbursedAt: string | null; termMonths: number }[]
  cashFlow: { last30DaysIncomeKes: number; last30DaysExpensesKes: number; last30DaysNetKes: number }
}

function emptyCreditReport(): CreditReport {
  return { creditScore: null, loans: [], cashFlow: { last30DaysIncomeKes: 0, last30DaysExpensesKes: 0, last30DaysNetKes: 0 } }
}

function buildRiskFlags(farmReport: FarmReport, credit: CreditReport): string[] {
  const flags = [...farmReport.overdueActivities]
  const lowStock = farmReport.inventory.filter((i) => i.remainingQty <= 0)
  for (const item of lowStock) flags.push(`${item.name} stock empty`)
  if (credit.creditScore && (credit.creditScore.band === 'C' || credit.creditScore.band === 'D')) {
    flags.push(`Credit band ${credit.creditScore.band} — elevated risk`)
  }
  return flags
}

export async function GET(req: NextRequest, { params }: { params: { farmerId: string } }) {
  const session = await getServerSession()
  if (!session || session.role !== 'lender') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const farmerId = params.farmerId
  const asOfDate = req.nextUrl.searchParams.get('as_of') ?? new Date().toISOString().slice(0, 10)
  const token = cookies().get('__ac')?.value ?? ''

  const [identityRes, farmReportRes, creditRes] = await Promise.all([
    fetch(`${AUTH}/internal/admin/users/batch?ids=${encodeURIComponent(farmerId)}`, {
      headers: { 'x-service-token': SERVICE_TOKEN },
      cache: 'no-store',
    }),
    fetch(`${FARM_SERVICE}/internal/production/${encodeURIComponent(farmerId)}/report?as_of_date=${asOfDate}`, {
      headers: { 'x-service-token': SERVICE_TOKEN },
      cache: 'no-store',
    }),
    fetch(`${FINANCE_URL}/api/v1/finance/lender/farmer-reports/${encodeURIComponent(farmerId)}/credit`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }),
  ])

  if (!identityRes.ok || !farmReportRes.ok) {
    return NextResponse.json({ message: 'Failed to load farmer report' }, { status: 502 })
  }

  const identityBody = (await identityRes.json()) as { data: Record<string, FarmerIdentity> }
  const identity = identityBody.data[farmerId]
  if (!identity) {
    return NextResponse.json({ message: 'Farmer not found' }, { status: 404 })
  }

  const farmReportBody = (await farmReportRes.json()) as { data: FarmReport }
  const farmReport = farmReportBody.data

  const credit = creditRes.ok ? ((await creditRes.json()) as { data: CreditReport }).data : emptyCreditReport()

  return NextResponse.json({
    data: {
      farmerId,
      farmer: {
        fullName: identity.fullName,
        phone: identity.phone,
        county: identity.county,
        subCounty: identity.subCounty,
        farmerType: farmReport.farm?.farmType ?? null,
        memberSince: identity.memberSince,
        kycStatus: identity.kycStatus,
      },
      creditScore: credit.creditScore,
      farm: farmReport.farm,
      activitySummary: farmReport.activitySummary,
      overdueActivities: farmReport.overdueActivities,
      harvestHistory: farmReport.harvestHistory,
      inventory: farmReport.inventory,
      machinery: farmReport.machinery,
      loanHistory: credit.loans,
      cashFlow: credit.cashFlow,
      riskFlags: buildRiskFlags(farmReport, credit),
      generatedAt: new Date().toISOString(),
    },
  })
}
