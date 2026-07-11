function fileTimestamp(): string {
  return new Date().toISOString().slice(0, 10)
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

function toCsv(headers: string[], rows: (string | number)[][]): Blob {
  const lines = [headers.map((h) => `"${h}"`).join(',')]
  for (const row of rows) {
    lines.push(row.map((v) => `"${v}"`).join(','))
  }
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
}

export interface FarmerListRow {
  farmerId: string
  fullName: string | null
  idNumber: string | null
  county: string | null
  subCounty: string | null
  areaAcres: number | null
  farmerType: string | null
}

export function exportFarmerListCsv(rows: FarmerListRow[]): void {
  const blob = toCsv(
    ['Name', 'ID No', 'County', 'Sub-county', 'Acreage', 'Farmer Type'],
    rows.map((r) => [
      r.fullName ?? r.farmerId,
      r.idNumber ?? '—',
      r.county ?? '—',
      r.subCounty ?? '—',
      r.areaAcres ?? '—',
      r.farmerType ?? '—',
    ]),
  )
  triggerDownload(blob, `farmer-list-report-${fileTimestamp()}.csv`)
}

export interface IncomeStatementRow {
  farmerId: string
  fullName: string | null
  totalIncomeKes: number
  totalExpenseKes: number
  netIncomeKes: number
}

export function exportIncomeStatementCsv(rows: IncomeStatementRow[]): void {
  const blob = toCsv(
    ['Farmer Name', 'Total Income (KES)', 'Total Expenses (KES)', 'Net Income (KES)'],
    rows.map((r) => [r.fullName ?? r.farmerId, r.totalIncomeKes, r.totalExpenseKes, r.netIncomeKes]),
  )
  triggerDownload(blob, `income-statement-${fileTimestamp()}.csv`)
}
