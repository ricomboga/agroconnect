'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Loader2, TrendingUp } from 'lucide-react'

interface FarmSummary {
  farmId: string
  totalYieldKg: number
  totalInputCostsKes: number
  totalLabourCostsKes: number
  totalCostsKes: number
  totalRevenueKes: number
  profitEstimateKes: number
}

interface SummaryResponse {
  data: FarmSummary
}

const CURRENT_YEAR = new Date().getFullYear()
const SEASONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

export function SummaryExportTab({ farmId }: { farmId: string }) {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading, isError } = useQuery<SummaryResponse>({
    queryKey: ['farmer', 'summary', farmId, year],
    queryFn: async () => {
      const res = await fetch(
        `/api/farm/farms/${farmId}/summary?from_date=${year}-01-01&to_date=${year}-12-31`,
      )
      if (!res.ok) throw new Error('Failed to load summary')
      return res.json()
    },
  })

  const summary = data?.data

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/farm/farms/${farmId}/report`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Failed to generate report')
      }
      const body = await res.json() as { data: { url: string } | { jobId: string } }
      if ('url' in body.data) {
        window.open(body.data.url, '_blank')
      } else {
        toast.success('Report generation started — check back shortly')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">Profit &amp; loss summary by season</div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1">
          {SEASONS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                year === y ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>
      ) : isError || !summary ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <TrendingUp className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No summary data for {year}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400">Total Yield</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{summary.totalYieldKg.toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Revenue</p>
              <p className="mt-1 text-lg font-bold text-green-700">KES {summary.totalRevenueKes.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Costs (inputs + labour)</p>
              <p className="mt-1 text-lg font-bold text-orange-600">KES {summary.totalCostsKes.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Profit Estimate</p>
              <p className={`mt-1 text-lg font-bold ${summary.profitEstimateKes >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                KES {summary.profitEstimateKes.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
            <button
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Preparing…' : 'Download Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
