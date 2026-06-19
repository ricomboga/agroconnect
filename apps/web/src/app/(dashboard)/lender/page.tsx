import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { CreditCard, Clock, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react'
import { getServerSession } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoanPipelineTable, type LoanSummary } from './_components/LoanPipelineTable'

const FINANCE_URL = process.env.FINANCE_SERVICE_URL ?? 'http://localhost:3003'

interface PipelineCounts {
  submitted: number
  under_review: number
  approved: number
  disbursed: number
  defaulted: number
}

interface PipelineData {
  loans: LoanSummary[]
  counts: PipelineCounts
}

async function fetchPipeline(token: string): Promise<PipelineData> {
  try {
    const res = await fetch(`${FINANCE_URL}/api/v1/finance/lender/loans`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { loans: [], counts: defaultCounts() }
    const body = (await res.json()) as { data: PipelineData }
    return body.data
  } catch {
    return { loans: [], counts: defaultCounts() }
  }
}

function defaultCounts(): PipelineCounts {
  return { submitted: 0, under_review: 0, approved: 0, disbursed: 0, defaulted: 0 }
}

const PIPELINE_CARDS = [
  {
    key: 'submitted' as const,
    label: 'Submitted',
    Icon: CreditCard,
    color: 'text-blue-500',
  },
  {
    key: 'under_review' as const,
    label: 'Under Review',
    Icon: Clock,
    color: 'text-yellow-500',
  },
  {
    key: 'approved' as const,
    label: 'Approved',
    Icon: CheckCircle,
    color: 'text-green-500',
  },
  {
    key: 'disbursed' as const,
    label: 'Disbursed',
    Icon: DollarSign,
    color: 'text-emerald-500',
  },
  {
    key: 'defaulted' as const,
    label: 'Defaulted',
    Icon: AlertTriangle,
    color: 'text-red-500',
  },
]

export default async function LenderPipelinePage() {
  const session = await getServerSession()
  if (!session || !(['lender', 'admin'] as string[]).includes(session.role)) {
    redirect('/login')
  }

  const token = cookies().get('__ac')?.value ?? ''
  const { loans, counts } = await fetchPipeline(token)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Loan Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Applications assigned to your institution</p>
      </div>

      {/* Status summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {PIPELINE_CARDS.map(({ key, label, Icon, color }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{counts[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications table */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Applications ({loans.length})
        </h2>
        <LoanPipelineTable loans={loans} />
      </div>
    </div>
  )
}
