import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { buildMockFarmerReport } from '../../_mock/farmerReportSeed'

export async function GET(_req: Request, { params }: { params: { farmerId: string } }) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: buildMockFarmerReport(params.farmerId) })
}
