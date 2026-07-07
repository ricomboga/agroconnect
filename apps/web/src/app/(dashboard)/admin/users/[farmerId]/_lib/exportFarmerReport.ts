interface MonthlyTotal {
  month: string
  incomeKes: number
  expenseKes: number
  netKes: number
}

interface MonthlyYield {
  month: string
  harvestedKg: number
}

interface FarmerReport {
  transactions: {
    byMonth: MonthlyTotal[]
  }
  production: {
    monthlyYieldKg: MonthlyYield[]
  }
  creditScore: {
    score: number
    band: string
    breakdown: {
      harvestYieldScore: number
      inputManagementScore: number
      activityComplianceScore: number
      platformEngagementScore: number
    }
  } | null
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportFarmerReportCsv(farmerId: string, report: FarmerReport): void {
  const lines: string[] = []
  lines.push(`"Farmer Report — ${farmerId}"`)
  lines.push(`"Generated: ${new Date().toLocaleString('en-KE')}"`)
  lines.push('')

  lines.push('Income vs Expenses by Month')
  lines.push('"month","incomeKes","expenseKes","netKes"')
  for (const row of report.transactions.byMonth) {
    lines.push(`"${row.month}","${row.incomeKes}","${row.expenseKes}","${row.netKes}"`)
  }
  lines.push('')

  lines.push('Harvest Yield by Month')
  lines.push('"month","harvestedKg"')
  for (const row of report.production.monthlyYieldKg) {
    lines.push(`"${row.month}","${row.harvestedKg}"`)
  }
  lines.push('')

  lines.push('Credit Score Breakdown')
  if (report.creditScore) {
    lines.push(`"score","${report.creditScore.score}"`)
    lines.push(`"band","${report.creditScore.band}"`)
    for (const [key, value] of Object.entries(report.creditScore.breakdown)) {
      lines.push(`"${key}","${value}"`)
    }
  } else {
    lines.push('"Not yet computed"')
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `farmer-report-${farmerId}-${new Date().toISOString().slice(0, 10)}.csv`)
}
